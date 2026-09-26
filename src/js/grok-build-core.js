/* Panupan Agent Core
 * Grok Build-inspired agent runtime for the browser builder.
 * IMPORTANT: Puter.js remains the model transport and authentication path.
 * This layer replaces the old tool loop with a bounded, retrying runtime.
 */
(function () {
    const MAX_AGENT_ROUNDS = 40;
    const MAX_TOOL_RETRIES = 2;
    const RETRY_BASE_MS = 350;
    const TRANSIENT_ERROR_RE = /(?:429|408|409|425|500|502|503|504|timeout|timed out|temporar|rate limit|network|fetch failed|connection)/i;

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const isTransientError = error => TRANSIENT_ERROR_RE.test(error?.error?.message || error?.message || String(error || ''));

    function getTools(state) {
        return state?.tools || window.getTurnTools?.() || window.tools || [];
    }
    function findTool(name, state) {
        return getTools(state).find(tool => tool?.function?.name === name);
    }
    async function executeTool(name, args, state) {
        const tool = findTool(name, state);
        if (!tool) throw new Error(`Unknown function: ${name}`);
        let lastError;
        for (let attempt = 0; attempt <= MAX_TOOL_RETRIES; attempt++) {
            if (state?.abortController?.signal?.aborted) throw new DOMException('The active turn was aborted.', 'AbortError');
            try {
                return { result: await tool.exec(args, state), attempts: attempt + 1 };
            } catch (error) {
                lastError = error;
                if (!isTransientError(error) || attempt >= MAX_TOOL_RETRIES) break;
                await sleep(RETRY_BASE_MS * (2 ** attempt));
            }
        }
        throw lastError;
    }
    function addToolResult(history, id, value, isError = false) {
        const blocks = !isError && value && typeof value === 'object' && Array.isArray(value.__contentBlocks);
        history.push({ role: 'user', content: {
            type: 'tool_result',
            tool_use_id: id,
            content: blocks ? value.__contentBlocks : JSON.stringify(value),
            ...(isError ? { is_error: true } : {})
        }});
    }
    function hasToolResult(history, id) {
        if (!Array.isArray(history) || id == null) return false;
        for (let i = history.length - 1; i >= 0; i--) {
            const m = history[i], c = m?.content;
            if (m?.role === 'user' && c && !Array.isArray(c) && c.type === 'tool_result' && c.tool_use_id === id) return true;
        }
        return false;
    }
    function recordMutation(name, input, chatId) {
        window.markProjectModified?.(name, chatId);
        try {
            const base = s => typeof s === 'string' ? s.slice(s.lastIndexOf('/') + 1) : '';
            const trim = s => typeof s === 'string' ? s.replace(/\/+$/, '') : '';
            if (name === 'rename' && input?.path && input?.new_name) {
                window.recordPreviewChange?.(input.path.slice(0, input.path.lastIndexOf('/') + 1) + input.new_name);
            } else if (name === 'copy' && input?.path && input?.destination) {
                window.recordPreviewChange?.(trim(input.destination) + '/' + base(input.path));
            } else if (name === 'move' && Array.isArray(input?.paths_array) && input.destination) {
                input.paths_array.forEach(p => window.recordPreviewChange?.(trim(input.destination) + '/' + base(p)));
            } else {
                if (input?.path) window.recordPreviewChange?.(input.path);
                if (Array.isArray(input?.paths_array)) input.paths_array.forEach(p => window.recordPreviewChange?.(p));
            }
        } catch (_) {}
    }
    async function runTools(calls, state) {
        const results = [];
        for (const call of calls) {
            if (state?.abortController?.signal?.aborted || window.isStaleTurn?.(state)) return { aborted: true, results };
            try {
                const executed = await executeTool(call.name, call.input, state);
                if (!hasToolResult(state.chatHistory, call.id)) addToolResult(state.chatHistory, call.id, executed.result, call.name.startsWith('mcp_') && executed.result?.isError === true);
                results.push({ id: call.id, name: call.name, ok: true, attempts: executed.attempts });
            } catch (error) {
                const message = error?.error?.message || error?.message || String(error);
                if (!hasToolResult(state.chatHistory, call.id)) addToolResult(state.chatHistory, call.id, { error: message }, true);
                results.push({ id: call.id, name: call.name, ok: false, error: message });
            } finally {
                recordMutation(call.name, call.input || {}, state.currentChatId);
            }
        }
        return { aborted: false, results };
    }
    window.PanupanGrokCore = { MAX_AGENT_ROUNDS, MAX_TOOL_RETRIES, isTransientError, getTools, findTool, executeTool, addToolResult, hasToolResult, runTools, recordMutation };
})();
