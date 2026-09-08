import {
  IDLE_RIG,
  LAYERS,
  type CoreLayerName,
  type LayerName,
  type RigDefinition,
  type RigImages,
  type RigExpression,
} from './alice-rig';
import { composeFaceFrames } from './alice-face';
import { type AlicePose } from './alice-poses';
import { ALICE_MODELS, type AliceModel } from './alice-models';
import { getAliceExpression, type AliceExpression } from './alice-expressions';

export type RigPose = AlicePose;
export type RigManifest = {
  width: number;
  height: number;
  source: string;
  rig?: RigDefinition['rig'];
  layers: {
    id: LayerName;
    file: string;
    runtimeFile: string;
    left: number;
    top: number;
    width: number;
    height: number;
  }[];
};
export type RigAsset = {
  model: AliceModel;
  pose: RigPose;
  definition: RigDefinition;
  images: RigImages;
  rigDirectory?: string;
};
export function definitionFromManifest(manifest: RigManifest): RigDefinition {
  const layers = Object.fromEntries(
    manifest.layers.map((layer) => [
      layer.id,
      {
        x: layer.left,
        y: layer.top,
        width: layer.width,
        height: layer.height,
      },
    ]),
  ) as RigDefinition['layers'];
  for (const id of Object.keys(LAYERS) as CoreLayerName[]) {
    const rect = layers[id];
    if (
      !rect ||
      ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) ||
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      throw new Error(`Missing or invalid Alice layer: ${id}`);
    }
  }
  if (!(manifest.width > 0 && manifest.height > 0))
    throw new Error('Invalid Alice canvas size');
  return {
    width: manifest.width,
    height: manifest.height,
    layers,
    rig: manifest.rig ?? IDLE_RIG.rig,
  };
}
const cache = new Map<string, Promise<RigAsset>>();
export function loadRigAsset(
  pose: RigPose,
  model: AliceModel = 'winter',
  expressionId?: string,
): Promise<RigAsset> {
  const assets = ALICE_MODELS[model];
  if (!assets.poses.includes(pose))
    return Promise.reject(
      new Error(`Unsupported Alice pose: ${model}/${pose}`),
    );
  const { rigDirectory } = getAliceExpression(model, pose, expressionId);
  const key = `${model}:${pose}${rigDirectory ? `:${rigDirectory}` : ''}`;
  const cached = cache.get(key);
  if (cached) {
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }
  const base = `${assets.assetBase}/${rigDirectory ?? `layers${pose === 'idle' ? '' : `/${pose}`}`}`;
  const pending = (async () => {
    const response = await fetch(`${base}/manifest.json?v=${assets.revision}`);
    if (!response.ok) throw new Error(`Cannot load Alice pose: ${pose}`);
    const manifest: RigManifest = await response.json();
    const definition = definitionFromManifest(manifest);
    const entries = await Promise.all(
      manifest.layers.map(
        (layer) =>
          new Promise<[LayerName, HTMLImageElement]>((resolve, reject) => {
            const image = new Image();
            image.decoding = 'async';
            image.fetchPriority = 'low';
            image.onload = () => {
              // onload alone can leave decoding work for the first visible draw.
              image.decode().then(() => resolve([layer.id, image]), reject);
            };
            image.onerror = () =>
              reject(new Error(`Cannot load Alice layer: ${pose}/${layer.id}`));
            image.src = `${base}/${layer.runtimeFile}?v=${assets.revision}`;
          }),
      ),
    );
    const images = composeFaceFrames(
      Object.fromEntries(entries) as unknown as RigImages,
      definition,
      (width, height) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
      },
    );
    return { model, pose, definition, images, rigDirectory };
  })();
  cache.set(key, pending);
  // Keep the current and most recently used pose, releasing older decoded layers.
  while (cache.size > 2) cache.delete(cache.keys().next().value!);
  pending.catch(() => {
    if (cache.get(key) === pending) cache.delete(key);
  });
  return pending;
}

// Tied to the two-pose cache lifetime; decoding a new face never reloads a body.
const expressionCache = new WeakMap<
  RigAsset,
  Map<string, Promise<RigExpression>>
>();
export function loadRigExpression(
  asset: RigAsset,
  expression: AliceExpression,
): Promise<RigExpression> {
  if (!expression.patch) return Promise.resolve({ id: expression.id });
  let cached = expressionCache.get(asset);
  if (!cached) expressionCache.set(asset, (cached = new Map()));
  const existing = cached.get(expression.id);
  if (existing) return existing;
  const patch = expression.patch;
  const config = ALICE_MODELS[asset.model];
  const base = `${config.assetBase}/layers${asset.pose === 'idle' ? '' : `/${asset.pose}`}`;
  const load = (file: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = 'low';
      image.onload = () => {
        image.decode().then(() => resolve(image), reject);
      };
      image.onerror = () =>
        reject(
          new Error(
            `Cannot load Alice expression: ${asset.model}/${asset.pose}/${expression.id}`,
          ),
        );
      image.src = `${base}/${file}?v=${config.revision}`;
    });
  const pending = Promise.all([
    load(patch.runtimeFile),
    load(patch.maskFile),
  ]).then(([image, mask]) => ({
    id: expression.id,
    image,
    mask,
    rect: {
      x: patch.left,
      y: patch.top,
      width: patch.width,
      height: patch.height,
    },
  }));
  cached.set(expression.id, pending);
  while (cached.size > 2) cached.delete(cached.keys().next().value!);
  pending.catch(() => {
    if (cached.get(expression.id) === pending) cached.delete(expression.id);
  });
  return pending;
}
