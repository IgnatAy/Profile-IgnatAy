'use client';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  advanceRig,
  createRigState,
  drawRig,
  type RigExpression,
} from '@/models/alice/alice-rig';
import { createBodyRenderer } from '@/models/alice/alice-body';
import {
  advanceIdleMotion,
  createIdleMotion,
} from '@/models/alice/alice-motion';
import {
  loadRigAsset,
  loadRigExpression,
  type RigAsset,
  type RigPose,
} from '@/models/alice/alice-rig-assets';
import { createFrameLoop } from './alice-frame-loop';
import type { AliceModel } from './alice-models';
import { getAliceExpression } from './alice-expressions';

type Props = {
  model?: AliceModel;
  enabled: boolean;
  motion: boolean;
  autonomous?: boolean;
  speaking: boolean;
  fullBody: boolean;
  exploded: boolean;
  strength: number;
  blinkSignal: number;
  pose?: RigPose;
  expression?: string;
  onReady: (pose: RigPose) => void;
  onError: () => void;
};
export function LayeredAlice(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const options = useRef(props);
  useLayoutEffect(() => {
    options.current = props;
  });
  const invalidate = useRef<(() => void) | null>(null);
  const pose = props.pose ?? 'idle';
  const model = props.model ?? 'winter';
  const expression = getAliceExpression(model, pose, props.expression);
  const rigDirectory = expression.rigDirectory;
  const paintedExpression = useRef<{
    asset: RigAsset;
    expression: RigExpression;
  } | null>(null);
  const [asset, setAsset] = useState<RigAsset | null>(null);
  const paintedAsset = useRef<RigAsset | null>(null);
  const poseFade = useRef<Animation | null>(null);
  // Pose assets change, but the character's motion must not restart at zero.
  const animation = useRef({
    state: createRigState(),
    idleMotion: createIdleMotion(),
    time: 0,
    moving: props.motion,
  });
  useEffect(() => {
    if (!props.enabled) return;
    let disposed = false;
    loadRigAsset(pose, model, options.current.expression)
      .then(async (loaded) => {
        if (disposed) return;
        const initial = getAliceExpression(
          model,
          pose,
          options.current.expression,
        );
        const initialFace = await loadRigExpression(loaded, initial).catch(
          () => ({ id: getAliceExpression(model, pose).id }),
        );
        if (disposed) return;
        // Keep animating the old pose while textures decode. Only fade it out
        // once the replacement is available, retaining the same canvas.
        const el = canvas.current;
        if (
          el &&
          paintedAsset.current &&
          paintedAsset.current !== loaded &&
          options.current.motion
        ) {
          const fade = el.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 280,
            easing: 'ease',
            fill: 'forwards',
          });
          poseFade.current = fade;
          await fade.finished;
        }
        if (!disposed) {
          paintedExpression.current = {
            asset: loaded,
            expression: initialFace,
          };
          setAsset(loaded);
        }
      })
      .catch(() => {
        if (!disposed) options.current.onError();
      });
    return () => {
      disposed = true;
      poseFade.current?.cancel();
      poseFade.current = null;
    };
  }, [pose, model, props.enabled, props.motion, rigDirectory]);
  useEffect(() => {
    if (
      !asset ||
      asset.model !== model ||
      asset.pose !== pose ||
      asset.rigDirectory !== rigDirectory
    )
      return;
    let disposed = false;
    loadRigExpression(asset, expression)
      .then((loaded) => {
        if (disposed) return;
        paintedExpression.current = { asset, expression: loaded };
        invalidate.current?.();
      })
      .catch(() => {
        // An optional expression failure preserves the last decoded face. A later
        // draw can retry; it must not discard a working rig and all its animation.
      });
    return () => {
      disposed = true;
    };
  }, [asset, model, pose, expression, rigDirectory]);
  useEffect(() => {
    const el = canvas.current;
    if (!el || !asset || asset.model !== model || !props.enabled) return;
    const { images, definition } = asset;
    const ctx = el.getContext('2d', { alpha: true });
    if (!ctx) {
      options.current.onError();
      return;
    }
    let width = 0,
      height = 0,
      portraitHeight = 0,
      portraitWidth = 0,
      previous = 0,
      notified = false;
    let inView = true,
      fps = 60;
    let blinkStart = -1000,
      nextBlink = performance.now() + 1800;
    let signal = options.current.blinkSignal;
    let talkTime = 0,
      nextMouth = 0,
      mouthOpen = false;
    let { state, idleMotion, time, moving } = animation.current;
    const bodyRenderer = createBodyRenderer(images, definition);
    const layoutTarget = el.closest('.character-touch') ?? el;
    const render = (now: number) => {
      const p = options.current;
      const dt = previous ? Math.min((now - previous) / 1000, 1 / 30) : 1 / 60;
      previous = now;
      // Reduced motion becomes a stable still frame immediately.
      if (moving !== p.motion) {
        state = createRigState();
        idleMotion = createIdleMotion();
        moving = p.motion;
        blinkStart = -1000;
      }
      if (p.motion) time += dt;
      const gesture = advanceIdleMotion(
        idleMotion,
        dt,
        Boolean(p.autonomous && p.motion && !p.exploded),
      );
      advanceRig(
        state,
        time,
        dt,
        p.motion,
        p.exploded,
        p.strength,
        gesture,
      );
      if (
        definition.rig.blink &&
        p.motion &&
        (signal !== p.blinkSignal || (!p.exploded && now >= nextBlink))
      ) {
        signal = p.blinkSignal;
        blinkStart = now;
        nextBlink = now + 3200 + Math.random() * 3200;
      }
      const phase = now - blinkStart;
      const blink =
        phase < 65
          ? 'half'
          : phase < 145
            ? 'closed'
            : phase < 220
              ? 'half'
              : 'open';
      if (p.speaking && definition.rig.mouth) {
        talkTime += dt * 1000;
        if (talkTime >= nextMouth) {
          mouthOpen = !mouthOpen;
          nextMouth = talkTime + (mouthOpen ? 135 : 105) + Math.random() * 140;
        }
      } else {
        mouthOpen = false;
        talkTime = 0;
        nextMouth = 0;
      }
      drawRig(
        ctx,
        width,
        height,
        images,
        {
          state,
          time,
          fullBody: p.fullBody,
          portraitHeight,
          portraitWidth,
          motion: p.motion,
          strength: p.strength,
          blink,
          mouthOpen,
          exploded: p.exploded,
          definition,
          expression:
            paintedExpression.current?.asset === asset
              ? paintedExpression.current.expression
              : undefined,
        },
        bodyRenderer.paint,
      );
      if (!notified) {
        notified = true;
        paintedAsset.current = asset;
        // Reveal only after the new pose has actually painted. Removing the
        // outgoing fade and starting the incoming one happen before presentation.
        if (poseFade.current) {
          poseFade.current.cancel();
          poseFade.current = p.motion
            ? el.animate([{ opacity: 0 }, { opacity: 1 }], {
                duration: 280,
                easing: 'ease',
              })
            : null;
        }
        if ((options.current.pose ?? 'idle') === asset.pose)
          options.current.onReady(asset.pose);
      }
      if (el.dataset.blink !== blink) el.dataset.blink = blink;
      el.dataset.expression =
        paintedExpression.current?.asset === asset
          ? paintedExpression.current.expression.id
          : getAliceExpression(model, asset.pose).id;
    };
    const loop = createFrameLoop(render, {
      request: (callback) => requestAnimationFrame(callback),
      cancel: (id) => cancelAnimationFrame(id),
    });
    const sync = () => {
      loop.update({
        visible: !document.hidden && inView && width > 0 && height > 0,
        active: options.current.motion || options.current.speaking,
        fps,
      });
    };
    invalidate.current = () => {
      sync();
      loop.invalidate();
    };
    const resize = () => {
      // Measure the visible owner while the pending canvas is display:none.
      // CSS transforms affect boundingClientRect, but not the canvas layout.
      width = layoutTarget.clientWidth;
      height = layoutTarget.clientHeight;
      // Extend the canvas upward without enlarging the existing portrait.
      const companion = el.closest('.companion');
      portraitHeight = companion?.clientHeight ?? height;
      portraitWidth = companion?.clientWidth ?? width;
      const compact = portraitWidth <= 200;
      fps = compact ? 30 : 60;
      const ratio = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2);
      const pixelWidth = Math.max(1, Math.round(width * ratio)),
        pixelHeight = Math.max(1, Math.round(height * ratio));
      if (el.width !== pixelWidth || el.height !== pixelHeight) {
        el.width = pixelWidth;
        el.height = pixelHeight;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.imageSmoothingQuality = 'high';
      }
      // Resizing clears a canvas. Repaint in this same callback so the browser
      // cannot present an empty frame while waiting for the next animation tick.
      if (!document.hidden && inView && width > 0 && height > 0)
        render(performance.now());
      sync();
      loop.invalidate();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(layoutTarget);
    resize();
    const intersection = new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      previous = 0;
      sync();
    });
    intersection.observe(layoutTarget);
    const visibility = () => {
      previous = 0;
      nextBlink = performance.now() + 1800;
      sync();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      animation.current = { state, idleMotion, time, moving };
      invalidate.current = null;
      loop.dispose();
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      bodyRenderer.dispose();
    };
  }, [asset, model, props.enabled]);
  useEffect(() => {
    invalidate.current?.();
  }, [
    props.motion,
    props.speaking,
    props.autonomous,
    props.fullBody,
    props.exploded,
    props.strength,
    props.blinkSignal,
  ]);
  return (
    <canvas
      ref={canvas}
      className="layered-alice-canvas"
      data-rig-pose={pose}
      data-rig-model={model}
      aria-hidden="true"
    />
  );
}
