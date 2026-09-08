// Count visible time only, and fire each event once even after tab suspension.
export function startVisibleTimeline(
  events: { after: number; run: () => void }[],
) {
  const pending = events.map((event) => ({
    ...event,
    remaining: event.after,
    fired: false,
  }));
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let started: number | null = null;
  let stopped = false;
  const pause = () => {
    timers.forEach(clearTimeout);
    timers.clear();
    if (started !== null) {
      const elapsed = performance.now() - started;
      pending.forEach((event) => {
        event.remaining = Math.max(0, event.remaining - elapsed);
      });
      started = null;
    }
  };
  const resume = () => {
    pause();
    if (document.hidden || stopped) return;
    started = performance.now();
    pending
      .filter((event) => !event.fired)
      .forEach((event) => {
        const timer = setTimeout(() => {
          timers.delete(timer);
          if (stopped) return;
          event.fired = true;
          event.run();
        }, event.remaining);
        timers.add(timer);
      });
  };
  document.addEventListener('visibilitychange', resume);
  resume();
  return () => {
    stopped = true;
    pause();
    document.removeEventListener('visibilitychange', resume);
  };
}
