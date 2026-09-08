'use client';
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Language } from '@/lib/profile';

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

export function DeferredCompanion({ lang }: { lang: Language }) {
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
        <Companion lang={lang} />
      </Suspense>
    </CompanionBoundary>
  ) : null;
}
