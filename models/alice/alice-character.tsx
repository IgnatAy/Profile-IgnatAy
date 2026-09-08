'use client';
/* oxlint-disable nextjs/no-img-element -- Local sprite fallback also works in the static build. */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { LayeredAlice } from '@/models/alice/layered-alice';
import { type AlicePose } from './alice-poses';
import { ALICE_MODELS, type AliceModel } from './alice-models';
import { getAliceExpression } from './alice-expressions';
import { useAliceExpression } from './use-alice-expression';
import { aliceFraming, aliceNeedsWidePortrait, aliceSpriteCenterRatio } from './alice-framing';
export type { AlicePose } from './alice-poses';
type Frame = AlicePose | 'half-eye' | 'talk' | 'front-talk';
function fitSprite(image: HTMLImageElement, fullBody: boolean, model: AliceModel, pose: AlicePose) {
  const owner = image.closest<HTMLElement>('.character-touch');
  if (!owner || !image.naturalWidth || !image.naturalHeight) return;
  const companion = owner.closest<HTMLElement>('.companion');
  const portraitHeight = companion?.clientHeight ?? owner.clientHeight;
  const portraitWidth = companion?.clientWidth ?? owner.clientWidth;
  const { scale, left, top } = aliceFraming(owner.clientWidth, owner.clientHeight, {
    width: image.naturalWidth, height: image.naturalHeight,
    centerX: image.naturalWidth * aliceSpriteCenterRatio(model, pose),
  }, fullBody, portraitHeight, portraitWidth);
  Object.assign(image.style, {
    width: `${image.naturalWidth * scale}px`,
    height: `${image.naturalHeight * scale}px`,
    left: `${left}px`, top: `${top}px`, transform: 'none',
  });
}
export function AliceCharacter({
  model = 'winter',
  pose,
  speaking,
  motion,
  autonomous = false,
  expressionId,
  fullBody,
  layered,
  exploded,
  strength,
  blinkSignal,
  label = 'Say hello to Alice',
  onInteract,
  onReady,
  onError,
  onLayerError,
}: {
  model?: AliceModel;
  label?: string;
  pose: AlicePose;
  speaking: boolean;
  motion: boolean;
  autonomous?: boolean;
  expressionId?: string;
  fullBody: boolean;
  onInteract: () => void;
  onReady: () => void;
  onError: () => void;
  layered: boolean;
  exploded: boolean;
  strength: number;
  blinkSignal: number;
  onLayerError: () => void;
}) {
  const modelAssets = ALICE_MODELS[model];
  const [rigReady, setRigReady] = useState<AlicePose | null>(null);
  const [displayPose, setDisplayPose] = useState(pose);
  const transitioning = !layered && pose !== displayPose;
  const [halfEye, setHalfEye] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const expression = useAliceExpression(model, pose, motion, visible, expressionId);
  const expressionKey = `${model}:${displayPose}`;
  const defaultExpression = getAliceExpression(model, displayPose);
  const requestedExpression =
    pose === displayPose ? expression : defaultExpression;
  const [spriteExpression, setSpriteExpression] = useState<{
    key: string;
    id: string;
  } | null>(null);
  const displayExpression =
    requestedExpression.id === defaultExpression.id
      ? defaultExpression
      : getAliceExpression(
          model,
          displayPose,
          spriteExpression?.key === expressionKey
            ? spriteExpression.id
            : undefined,
        );
  const nativeSprite =
    !layered && displayExpression.id !== defaultExpression.id;
  const [loadedFrames, setLoadedFrames] = useState(() => new Set<Frame>());
  const spriteContainer = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = spriteContainer.current;
    const owner = element?.closest('.character-touch');
    if (!element || !owner) return;
    const resize = () => element.querySelectorAll('img').forEach((image) =>
      fitSprite(image, fullBody, model, displayPose));
    const observer = new ResizeObserver(resize);
    observer.observe(owner);
    resize();
    return () => observer.disconnect();
  }, [fullBody, model, displayPose]);
  const callbacks = useRef({ onReady, onError });
  useLayoutEffect(() => {
    callbacks.current = { onReady, onError };
  });
  const showRig = layered && rigReady === displayPose;
  const loaded = loadedFrames.has(displayPose);
  useEffect(() => {
    // A decoded fallback may already exist when layered loading fails.
    if (!layered && loaded) callbacks.current.onReady();
  }, [layered, loaded]);
  useEffect(() => {
    // The rig keeps its current canvas until the requested pose has painted.
    // Never insert a differently aligned sprite between two layered poses.
    if (layered || pose === displayPose) return;
    const id = setTimeout(
      () => {
        setRigReady(null);
        setDisplayPose(pose);
      },
      motion ? 280 : 0,
    );
    return () => clearTimeout(id);
  }, [pose, displayPose, motion, layered]);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (
      layered ||
      !motion ||
      !visible ||
      !loaded ||
      displayPose !== 'idle' ||
      speaking
    )
      return;
    let id: ReturnType<typeof setTimeout>;
    const schedule = () => {
      id = setTimeout(
        () => {
          setHalfEye(true);
          id = setTimeout(() => {
            setHalfEye(false);
            schedule();
          }, 180);
        },
        2600 + Math.random() * 3000,
      );
    };
    id = setTimeout(() => {
      setHalfEye(false);
      schedule();
    }, 0);
    return () => clearTimeout(id);
  }, [layered, motion, visible, loaded, displayPose, speaking]);
  useEffect(() => {
    if (
      layered ||
      !speaking ||
      !visible ||
      !loaded ||
      (displayPose !== 'idle' && displayPose !== 'front')
    )
      return;
    let id: ReturnType<typeof setTimeout>;
    let open = false;
    const step = () => {
      open = !open;
      setMouthOpen(open);
      id = setTimeout(
        step,
        open ? 130 + Math.random() * 120 : 100 + Math.random() * 180,
      );
    };
    id = setTimeout(step, 0);
    return () => clearTimeout(id);
  }, [layered, speaking, visible, loaded, displayPose]);
  const talking = !layered && !nativeSprite && speaking && visible && mouthOpen;
  const blinking =
    !layered && !nativeSprite && motion && visible && !speaking && halfEye;
  const requestedFrame: Frame =
    displayPose === 'idle'
      ? talking
        ? 'talk'
        : blinking
          ? 'half-eye'
          : 'idle'
      : displayPose === 'front' && talking
        ? 'front-talk'
        : displayPose;
  const frame = loadedFrames.has(requestedFrame) ? requestedFrame : displayPose;
  // Only the current portrait is needed while the rig loads. Extra sprites are
  // fetched only when the layered renderer fails; release them after handoff.
  const frames: Frame[] = showRig
    ? []
    : !layered && displayPose === 'idle'
      ? ['idle', 'half-eye', 'talk']
      : !layered && displayPose === 'front'
        ? ['front', 'front-talk']
        : [displayPose];
  const currentReady = showRig || loadedFrames.has(frame);
  const expressionFrames =
    !layered && !showRig
      ? [
          ...new Map(
            [displayExpression, requestedExpression]
              .filter((item) => item.id !== defaultExpression.id)
              .map((item) => [item.id, item]),
          ).values(),
        ]
      : [];
  return (
    <button
      type="button"
      className={`character-touch ${currentReady ? 'is-ready' : ''} ${transitioning ? 'is-changing' : ''}`}
      aria-label={label}
      onClick={onInteract}
      disabled={!currentReady}
      data-pose={displayPose}
      data-wide-portrait={!fullBody && aliceNeedsWidePortrait(model, displayPose) ? 'true' : undefined}
      data-model={model}
      data-frame={frame}
      data-expression={showRig ? expression.id : displayExpression.id}
      data-renderer={showRig ? 'layered' : 'sprite'}
    >
      <div
        ref={spriteContainer}
        className="character-sprite"
        style={{ display: showRig ? 'none' : undefined }}
      >
        <div
          className={`character-breathe ${motion && visible && !showRig ? 'is-animated' : ''}`}
        >
          {frames.map((name) => (
            <img
              key={name}
              src={`${modelAssets.assetBase}/${name}.webp?v=${modelAssets.revision}`}
              alt=""
              draggable={false}
              decoding="async"
              fetchPriority="low"
              className={`character-image ${!nativeSprite && name === frame ? 'is-active' : ''}`}
              onLoad={(event) => {
                fitSprite(event.currentTarget, fullBody, model, displayPose);
                setLoadedFrames((current) =>
                  current.has(name) ? current : new Set([...current, name]),
                );
                if (name === displayPose && !layered) callbacks.current.onReady();
              }}
              onError={() => callbacks.current.onError()}
            />
          ))}
          {expressionFrames.map((item) => (
            <img
              key={`${expressionKey}:${item.id}`}
              src={`${modelAssets.assetBase}/${item.sprite}?v=${modelAssets.revision}`}
              alt=""
              draggable={false}
              decoding="async"
              fetchPriority="low"
              className={`character-image ${nativeSprite && item.id === displayExpression.id ? 'is-active' : ''}`}
              onLoad={(event) => {
                fitSprite(event.currentTarget, fullBody, model, displayPose);
                if (item.id === requestedExpression.id)
                  setSpriteExpression({ key: expressionKey, id: item.id });
              }}
            />
          ))}
        </div>
      </div>
      {layered && (
        <div
          className="layered-alice-holder"
          style={{ display: showRig ? undefined : 'none' }}
        >
          <LayeredAlice
            key={model}
            model={model}
            pose={pose}
            expression={expression.id}
            enabled={layered}
            motion={motion}
            autonomous={autonomous}
            speaking={speaking}
            fullBody={fullBody}
            exploded={exploded}
            strength={strength}
            blinkSignal={blinkSignal}
            onReady={(readyPose) => {
              if (readyPose !== pose) return;
              setDisplayPose(readyPose);
              setRigReady(readyPose);
              callbacks.current.onReady();
            }}
            onError={onLayerError}
          />
        </div>
      )}
    </button>
  );
}
