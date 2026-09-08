import {
  ALICE_NEUTRAL,
  isAliceEmotion,
  type AliceEmotionCue,
} from './alice-emotions';

const PREFIX = '[[AFFECT';
const MAX_HEADER = 128;

/** Consumes cumulative answer text AFTER the provider has removed reasoning.
 * Only the leading reserved header is interpreted; body text is never executed.
 * A malformed/truncated reserved header is discarded, not shown in the UI.
 */
export function createAliceReplyParser(
  onEmotion?: (cue: AliceEmotionCue, tagged: boolean) => void,
) {
  let bodyOffset: number | null = null;
  let discarded = false;
  let announced = false;
  const announce = (cue = ALICE_NEUTRAL, tagged = false) => {
    if (!announced) {
      announced = true;
      onEmotion?.(cue, tagged);
    }
  };
  return {
    push(answer: string, final = false): string {
      if (bodyOffset !== null) return answer.slice(bodyOffset).trimStart();
      const start = answer.length - answer.trimStart().length;
      const head = answer.slice(start);
      if (!head) return '';
      if (PREFIX.startsWith(head)) {
        if (final) {
          announce();
          if (head.length <= 2) return head;
        }
        return '';
      }
      if (!head.startsWith(PREFIX)) {
        bodyOffset = start;
        announce();
        return head;
      }
      const closing = head.indexOf(']]');
      const newline = head.indexOf('\n');
      // Never keep waiting on an oversized or interrupted control line.
      discarded ||= head.length > MAX_HEADER && closing === -1;
      if (closing !== -1 && (newline === -1 || closing < newline)) {
        const header = head.slice(0, closing + 2);
        const match =
          !discarded && header.length <= MAX_HEADER
            ? /^\[\[AFFECT:([a-z]+):(0(?:\.\d+)?|1(?:\.0+)?)\]\]$/.exec(header)
            : null;
        bodyOffset = start + closing + 2;
        const valid = match && isAliceEmotion(match[1]);
        announce(
          valid
            ? {
                emotion: match[1] as AliceEmotionCue['emotion'],
                intensity: Number(match[2]),
              }
            : ALICE_NEUTRAL,
          Boolean(valid),
        );
        return answer.slice(bodyOffset).trimStart();
      }
      if (newline !== -1) {
        bodyOffset = start + newline + 1;
        announce();
        return answer.slice(bodyOffset).trimStart();
      }
      if (discarded || final) announce();
      return '';
    },
  };
}
