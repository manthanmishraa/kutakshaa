import { describe, it, expect } from 'vitest';
import { buildChatHistory, MAX_HISTORY_TURNS } from './chat';

describe('buildChatHistory', () => {
  it('pairs each answered question into a turn the backend understands', () => {
    const messages = [
      { role: 'user', text: 'Who is case 102?' },
      { role: 'assistant', text: 'A 78-year-old man.' },
    ];

    expect(buildChatHistory(messages)).toEqual([
      { user: 'Who is case 102?', assistant: 'A 78-year-old man.' },
    ]);
  });

  it('drops a trailing question that has no answer yet', () => {
    const messages = [
      { role: 'user', text: 'Who is case 102?' },
      { role: 'assistant', text: 'A 78-year-old man.' },
      { role: 'user', text: 'What was he taking?' },
    ];

    expect(buildChatHistory(messages)).toHaveLength(1);
  });

  it('keeps only the most recent turns so the payload stays small', () => {
    const messages = [];
    for (let i = 0; i < MAX_HISTORY_TURNS + 3; i += 1) {
      messages.push({ role: 'user', text: `q${i}` });
      messages.push({ role: 'assistant', text: `a${i}` });
    }

    const history = buildChatHistory(messages);

    expect(history).toHaveLength(MAX_HISTORY_TURNS);
    expect(history[history.length - 1].user).toBe(`q${MAX_HISTORY_TURNS + 2}`);
  });

  it('ignores error bubbles so failures are not replayed as context', () => {
    const messages = [
      { role: 'user', text: 'Who is case 102?' },
      { role: 'assistant', text: 'Request failed', isError: true },
    ];

    expect(buildChatHistory(messages)).toEqual([]);
  });
});
