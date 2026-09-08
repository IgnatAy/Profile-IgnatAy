'use client';

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  getReducedMotion,
  subscribeReducedMotion,
} from '@/lib/browser-preferences';
import { ALICE_FADE_MS } from '@/lib/interaction-timing';

type RenderSlot<T extends string> = (
  value: T,
  ready: () => void,
  active: boolean,
) => ReactNode;

// Two live surfaces: prepare the incoming content immediately, keep the outgoing
// one running, and start the handoff only after the incoming first frame is ready.
export function FadedSwap<T extends string>({
  value,
  children,
  className = '',
  onShown,
}: {
  value: T;
  children: RenderSlot<T>;
  className?: string;
  onShown?: (value: T) => void;
}) {
  const [displayed, setDisplayed] = useState(value);
  const [requested, setRequested] = useState(value);
  const [ready, setReady] = useState<T | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const latest = useRef({ value, onShown });
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  if (requested !== value) {
    setRequested(value);
    setReady(null);
  }
  useLayoutEffect(() => {
    latest.current = { value, onShown };
  });
  const prepared = useCallback(
    (id: T) => {
      if (value === id) setReady(id);
    },
    [value],
  );

  useLayoutEffect(() => {
    if (ready !== value || !surface.current) return;
    const outgoing = displayed !== value;
    let cancelled = false;
    const animation = reduced
      ? null
      : surface.current.animate(
          outgoing
            ? [{ opacity: 1 }, { opacity: 0 }]
            : [{ opacity: 0 }, { opacity: 1 }],
          { duration: ALICE_FADE_MS, easing: 'ease', fill: 'forwards' },
        );
    void (animation?.finished ?? Promise.resolve())
      .then(() => {
        if (cancelled || latest.current.value !== value) return;
        if (outgoing) setDisplayed(value);
        else latest.current.onShown?.(value);
      })
      .catch(() => {
        /* Superseded navigation cancels only its own fade. */
      });
    return () => {
      cancelled = true;
      animation?.cancel();
    };
  }, [displayed, ready, value, reduced]);

  const slots = displayed === value ? [displayed] : [displayed, value];
  return (
    <div className={`faded-swap ${className}`}>
      {slots.map((id) => (
        <SwapSlot
          key={id}
          value={id}
          active={id === displayed}
          // Revisit an already mounted outgoing slot without remounting its content.
          requested={id === value}
          prepared={prepared}
          surface={id === displayed ? surface : undefined}
        >
          {children}
        </SwapSlot>
      ))}
    </div>
  );
}

function SwapSlot<T extends string>({
  value,
  active,
  requested,
  prepared,
  surface,
  children,
}: {
  value: T;
  active: boolean;
  requested: boolean;
  prepared: (value: T) => void;
  surface?: React.RefObject<HTMLDivElement | null>;
  children: RenderSlot<T>;
}) {
  const [ready, setReady] = useState(false);
  const notify = useCallback(() => setReady(true), []);
  useLayoutEffect(() => {
    if (ready && requested) prepared(value);
  }, [ready, requested, prepared, value]);
  return (
    <div
      ref={surface}
      className={`faded-swap-slot${active ? '' : ' is-pending'}${ready ? '' : ' is-preparing'}`}
      inert={!active || !ready}
      aria-hidden={!active || !ready ? true : undefined}
    >
      {children(value, notify, active)}
    </div>
  );
}

// Place inside Suspense so lazy content signals readiness after it commits.
export function FadedSwapReady({ onReady }: { onReady: () => void }) {
  useLayoutEffect(onReady, [onReady]);
  return null;
}
