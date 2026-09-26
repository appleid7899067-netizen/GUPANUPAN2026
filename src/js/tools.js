const showError = (placeholderMessage, errorText) => {
    if (placeholderMessage && placeholderMessage.length) {
        // Reuse the same friendly-text + styled-card treatment as chat-level
        // errors (appendErrorMessage), but in place of this tool's progress
        // placeholder. Swap the ai-message styling for the red error card.
        const friendly = friendlyErrorMessage(extractErrorText(errorText));
        placeholderMessage.removeClass('ai-message').addClass('error-message');
        placeholderMessage.find('.message-content').html(errorCardHTML(friendly));
    }
};

window.tools = [];


window.getTurnTools = function() {
    return [...window.tools, ...(window.mcpManager?.getTools() || [])];
};

window.findTool = function(name, state) {
    return (state?.tools || window.getTurnTools()).find(tool => tool.function.name === name);
}

window.executeFunction = async function(functionName, args, state) {
    const tool = window.findTool(functionName, state);
    if (!tool) {
        throw new Error(`Unknown function: ${functionName}`);
    }
    return await tool.exec(args, state);
}

// Helper function to add tool result to history
function addToolResultToHistory(history, toolCallId, toolResponse, isError = false) {
    // A tool may return content blocks for the model to see (e.g. an image) by
    // returning { __contentBlocks: [...] }. Pass those through as the tool_result
    // content array instead of stringifying it (used by ViewImage). Everything
    // else is serialized to a JSON string as before.
    const hasBlocks = !isError && toolResponse && typeof toolResponse === 'object'
        && Array.isArray(toolResponse.__contentBlocks);
    history.push({
        role: "user",
        content: {
            "type": "tool_result",
            tool_use_id: toolCallId,
            content: hasBlocks ? toolResponse.__contentBlocks : JSON.stringify(toolResponse),
            ...(isError && { is_error: true })
        }
    });
}

// True when `history` already holds a tool_result for `toolUseId` — i.e. the
// interrupted-turn repair (repairDanglingToolUses in app.js) got there first.
function hasToolResultFor(history, toolUseId) {
    if (!Array.isArray(history) || toolUseId == null) return false;
    for (let i = history.length - 1; i >= 0; i--) {
        const m = history[i];
        const c = m && m.content;
        if (m && m.role === 'user' && c && typeof c === 'object' && !Array.isArray(c)
            && c.type === 'tool_result' && c.tool_use_id === toolUseId) return true;
    }
    return false;
}
window.hasToolResultFor = hasToolResultFor;

async function handleToolCalls(completion, isTopLevel = false, c) {
    const textContent = completion.text;
    delete completion.text;
    if (!Array.isArray(completion)) completion = [completion];

    if (textContent && textContent.trim()) {
        const messageId = generateMessageId();
        c.chatHistory.push({ role: "assistant", content: textContent, messageId });
        if (!hasActiveTodos()) appendMessage(textContent, false, false, false, false, messageId);
    }

    const toolCalls = completion.filter(t => t && t.type === 'tool_use');
    if (!toolCalls.length) {
        if (isTopLevel) scheduleSaveCurrentChat(c);
        return { history: c.chatHistory, messageContent: c.currentMessageContent };
    }

    c.agentRound = (c.agentRound || 0) + 1;
    if (c.agentRound > window.PanupanGrokCore.MAX_AGENT_ROUNDS) {
        const message = 'Agent loop stopped safely after reaching the maximum tool rounds. Continue the request to resume.';
        c.chatHistory.push({ role: "assistant", content: message, messageId: generateMessageId() });
        appendMessage(message, false);
        scheduleSaveCurrentChat(c);
        return { error: 'MAX_AGENT_ROUNDS', history: c.chatHistory };
    }

    c.chatHistory.push({
        role: "assistant",
        content: toolCalls.length === 1 ? toolCalls[0] : toolCalls
    });

    const run = await window.PanupanGrokCore.runTools(toolCalls, c);
    if (run.aborted) return { error: 'Aborted', history: c.chatHistory };
    scheduleSaveCurrentChat(c);

    spinner = showSpinner();
    if (isAborted(c.abortController) || isStaleTurn(c)) {
        spinner?.remove();
        spinner = null;
        return { error: 'Aborted', history: c.chatHistory };
    }
    if (!c.abortController) c.abortController = new AbortController();

    const stream = await abortableAwait(puter.ai.chat(prepareHistoryForAI(c.chatHistory), {
        model: MODEL,
        tools: c.tools || window.getTurnTools(),
        stream: true,
        reasoning_effort: 'high',
        signal: c.abortController.signal
    }), c.abortController.signal);

    if (!isStaleTurn(c)) window.noteTurnActivity?.();
    c.currentMessageContent = '';
    c.currentMessage = null;
    await handleMessageStream(stream, c);

    if (isAborted(c.abortController) || isStaleTurn(c)) return { error: 'Aborted', history: c.chatHistory };
    if (isTopLevel) scheduleSaveCurrentChat(c);

    return { history: c.chatHistory, messageContent: c.currentMessageContent };
}
