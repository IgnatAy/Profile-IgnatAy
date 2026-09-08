export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export const ALICE_MAX_TURNS = 10;

// A turn begins with a user message and includes its reply, when available.
// Count turns instead of messages so an in-flight question never leaves an
// orphaned assistant reply at the beginning of the retained context.
export function retainAliceTurns(messages: ChatMessage[]): ChatMessage[] {
  let turns = 0;
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].role !== 'user') continue;
    turns++;
    if (turns === ALICE_MAX_TURNS) return messages.slice(index);
  }
  return messages;
}
