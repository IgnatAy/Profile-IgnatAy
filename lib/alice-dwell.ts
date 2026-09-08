export const ALICE_DWELL_MS = 45_000;
export const ALICE_DWELL_HOLD_MS = 6000;

/** Counts foreground, focused reading time, with explicit chat pause.
 * Calling dispose on navigation discards elapsed time for that visit.
 */
export function startAliceDwell(onDwell: () => void, enabled = true) {
  let remaining = ALICE_DWELL_MS;
  let started: number | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let done = false;
  let allowed = enabled;
  const pause = () => {
    clearTimeout(timer);
    if (started !== null)
      remaining = Math.max(0, remaining - (performance.now() - started));
    started = null;
  };
  const resume = () => {
    pause();
    if (done || !allowed || document.hidden || !document.hasFocus()) return;
    started = performance.now();
    timer = setTimeout(() => {
      pause();
      done = true;
      onDwell();
    }, remaining);
  };
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('focus', resume);
  window.addEventListener('blur', pause);
  resume();
  return {
    setEnabled(value: boolean) {
      allowed = value;
      resume();
    },
    dispose() {
      done = true;
      pause();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('blur', pause);
    },
  };
}
