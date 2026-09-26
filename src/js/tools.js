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

// Compatibility surface only. The Grok Build core owns discovery/execution.
window.findTool = window.PanupanGrokCore.findTool;
window.executeFunction = async function(functionName, args, state) {
    return (await window.PanupanGrokCore.executeTool(functionName, args, state)).result;
};
window.hasToolResultFor = function(history, toolUseId) {
    return window.PanupanGrokCore.hasToolResult(history, toolUseId);
};
