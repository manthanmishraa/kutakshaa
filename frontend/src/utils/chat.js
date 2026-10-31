export const MAX_HISTORY_TURNS = 6;

/**
 * Turn the rendered message list into the {user, assistant} pairs the
 * /chat/query endpoint expects. Unanswered questions and error bubbles are
 * skipped so they never get replayed to the model as context.
 */
export function buildChatHistory(messages) {
  const turns = [];

  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    if (message.role !== 'user') continue;

    const reply = messages[i + 1];
    if (!reply || reply.role !== 'assistant' || reply.isError) continue;

    turns.push({ user: message.text, assistant: reply.text });
  }

  return turns.slice(-MAX_HISTORY_TURNS);
}
