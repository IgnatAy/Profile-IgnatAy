'use client';
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { Language } from '@/lib/profile';

// Keep in sync with the mobile notice/layout media query in globals.css.
// Coarse touch devices include tablets and phones in landscape orientation.
const MOBILE_QUERY = '(max-width: 760px), (hover: none) and (pointer: coarse)';
const getDesktop = () => !window.matchMedia(MOBILE_QUERY).matches;
const getServerDesktop = () => false;
function subscribeDesktop(listener: () => void) {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}

const Companion = lazy(() =>
  import('./alice-companion').then((module) => ({
    default: module.AliceCompanion,
  })),
);

// An optional animation chunk failing to download must not take down the page.
class CompanionBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type CompanionProps = { lang: Language; section: string };

export function DeferredCompanion({ lang, section }: CompanionProps) {
  const desktop = useSyncExternalStore(
    subscribeDesktop,
    getDesktop,
    getServerDesktop,
  );
  // Do not mount the loader on mobile: no chunk, textures, timers or canvas.
  // Switching to mobile also unmounts the model and cancels pending idle work.
  return desktop ? <IdleCompanion lang={lang} section={section} /> : null;
}

function IdleCompanion({ lang, section }: CompanionProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) return;
    let cancel = () => {};
    const start = () => {
      if (document.hidden) return;
      cancel();
      if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(() => setReady(true), {
          timeout: 1500,
        });
        cancel = () => window.cancelIdleCallback(id);
      } else {
        const id = window.setTimeout(() => setReady(true), 200);
        cancel = () => window.clearTimeout(id);
      }
    };
    const visibility = () => {
      if (document.hidden) cancel();
      else if (document.readyState === 'complete') start();
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancel();
      window.removeEventListener('load', start);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [ready]);
  return ready ? (
    <CompanionBoundary>
      <Suspense fallback={null}>
        <Companion lang={lang} section={section} />
      </Suspense>
    </CompanionBoundary>
  ) : null;
}
