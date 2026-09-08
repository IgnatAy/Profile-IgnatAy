import { startVisibleTimeline } from './visible-timeline';
import { ALICE_NEUTRAL, type AliceEmotionCue } from './alice-emotions';

export type AliceAffectSource =
  | 'chat'
  | 'attention'
  | 'dwell'
  | 'settle'
  | 'boundary';
export const ALICE_ANNOYANCE_THRESHOLD = 3;
export const ALICE_ANNOYANCE_MIN_INTENSITY = 0.5;
export type AliceAffect = AliceEmotionCue & {
  id: number;
  source: AliceAffectSource;
  priority: number;
  locked: boolean;
};
type AffectRequest = AliceEmotionCue & {
  source: AliceAffectSource;
  priority: number;
  holdMs: number;
  locked?: boolean;
};
type Scheduler = typeof startVisibleTimeline;

/** One writer for semantic state. Clothing changes only re-resolve the appearance.
 * Low-priority reactions are dropped while a conversation owns the portrait:
 * a stale reading reaction must not pop up after a later answer.
 */
export function createAliceAffectStore(
  schedule: Scheduler = startVisibleTimeline,
) {
  const listeners = new Set<() => void>();
  let current: AliceAffect | null = null;
  let serial = 0;
  let annoyance = 0;
  let stop: (() => void) | undefined;
  const publish = (next: AliceAffect | null) => {
    current = next;
    listeners.forEach((listener) => listener());
  };
  const clearTimer = () => {
    stop?.();
    stop = undefined;
  };
  const release = (holdMs: number) => {
    clearTimer();
    const id = current?.id;
    stop = schedule([
      {
        after: holdMs,
        run: () => {
          if (current?.id !== id) return;
          clearTimer();
          publish({
            ...ALICE_NEUTRAL,
            id: ++serial,
            source: 'settle',
            priority: 0,
            locked: false,
          });
          stop = schedule([
            {
              after: 1200,
              run: () => {
                clearTimer();
                publish(null);
              },
            },
          ]);
        },
      },
    ]);
  };
  return {
    getSnapshot: () => current,
    getServerSnapshot: () => null,
    subscribe(this: void, listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    request(request: AffectRequest): boolean {
      if (current?.source === 'boundary') return false;
      if (current && request.priority < current.priority) return false;
      clearTimer();
      const same =
        current?.emotion === request.emotion &&
        current.source === request.source;
      publish({
        emotion: request.emotion,
        intensity: Math.max(
          0,
          Math.min(
            1,
            same
              ? Math.max(current!.intensity, request.intensity)
              : request.intensity,
          ),
        ),
        id: same ? current!.id : ++serial,
        source: request.source,
        priority: request.priority,
        locked: Boolean(request.locked),
      });
      if (!request.locked) release(Math.max(800, request.holdMs));
      return true;
    },
    // Record once per successfully completed reply, after any provider fallback.
    // This count survives transient resets and history trimming in this document.
    recordChatReaction(cue: AliceEmotionCue) {
      if (current?.source === 'boundary') return;
      if (
        (cue.emotion !== 'annoyed' && cue.emotion !== 'angry') ||
        cue.intensity < ALICE_ANNOYANCE_MIN_INTENSITY
      )
        return;
      if (++annoyance < ALICE_ANNOYANCE_THRESHOLD) return;
      clearTimer();
      publish({
        emotion: 'angry',
        intensity: 1,
        id: ++serial,
        source: 'boundary',
        priority: 100,
        locked: true,
      });
    },
    finishChat() {
      if (current?.source !== 'chat') return;
      publish({ ...current, locked: false });
      release(4500);
    },
    reset() {
      if (current?.source === 'boundary') return;
      clearTimer();
      publish(null);
    },
    leaveSection() {
      if (current?.source === 'dwell') {
        clearTimer();
        publish(null);
      }
    },
  };
}

export const aliceAffect = createAliceAffectStore();
