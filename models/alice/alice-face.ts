import {
  drawHeadLayers,
  type FaceFrameKey,
  type LayerName,
  type RigDefinition,
  type RigImages,
} from './alice-rig';
import { prepareHairRibbon } from './alice-hair';

type FaceSurface = {
  width: number;
  height: number;
  getContext(type: '2d'): CanvasRenderingContext2D | null;
};
/** Register all facial features to one pixel grid before the head is rotated
 * or resized. Adjacent transparent crops must never be resampled separately. */
export function composeFaceFrames(
  images: RigImages,
  definition: RigDefinition,
  makeSurface: (width: number, height: number) => FaceSurface,
) {
  const source = (images.headRest ?? images.head) as CanvasImageSource & {
    width: number;
    height: number;
  };
  const rect = definition.layers.head,
    rx = source.width / rect.width,
    ry = source.height / rect.height;
  const frames: NonNullable<RigImages['faceFrames']> = {};
  const composed = new Map<FaceFrameKey, CanvasImageSource>();
  for (const eye of ['open', 'half', 'closed'] as const)
    for (const mouth of ['rest', 'talk'] as const) {
      const effectiveEye = definition.rig.blink ? eye : 'open';
      const effectiveMouth = definition.rig.mouth ? mouth : 'rest';
      const key: FaceFrameKey = `${eye}-${mouth}`,
        effectiveKey: FaceFrameKey = `${effectiveEye}-${effectiveMouth}`;
      // Compose a facial state only on its first use, sharing equivalent states.
      Object.defineProperty(frames, key, {
        enumerable: true,
        get() {
          const cached = composed.get(effectiveKey);
          if (cached) return cached;
          const surface = makeSurface(source.width, source.height),
            ctx = surface.getContext('2d');
          if (!ctx) throw new Error('Cannot compose Alice face');
          // Copy the base at 1:1 without a resampling kernel touching cutout edges.
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            effectiveMouth === 'talk' && images.headTalk
              ? images.headTalk
              : source,
            0,
            0,
          );
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          const patch = (id: LayerName) => {
            const image = images[id],
              layer = definition.layers[id];
            if (image && layer)
              ctx.drawImage(
                image,
                (layer.x - rect.x) * rx,
                (layer.y - rect.y) * ry,
                layer.width * rx,
                layer.height * ry,
              );
          };
          if (effectiveEye !== 'open' || !images.headRest)
            patch(
              effectiveEye === 'closed'
                ? 'eyesClosed'
                : effectiveEye === 'half'
                  ? 'eyesHalf'
                  : 'eyesOpen',
            );
          if (effectiveMouth === 'talk' || !images.headRest)
            patch(effectiveMouth === 'talk' ? 'mouth' : 'mouthClosed');
          composed.set(effectiveKey, surface as CanvasImageSource);
          return surface as CanvasImageSource;
        },
      });
    }
  images.faceFrames = frames;
  images.hairRibbons = {
    left: prepareHairRibbon(
      images.hairLeft,
      definition.layers.hairLeft,
      -1,
      definition.rig.hairLeft.pin,
      definition.rig.hairLeft.tip,
      makeSurface,
    ),
    right: prepareHairRibbon(
      images.hairRight,
      definition.layers.hairRight,
      1,
      definition.rig.hairRight.pin,
      definition.rig.hairRight.tip,
      makeSurface,
    ),
  };
  // One reusable native-resolution surface keeps face, hair roots and bow on
  // the same pixel grid. Only the finished head is rotated/downsampled.
  const padding = 24;
  const head = makeSurface(
    source.width + padding * 2,
    source.height + padding * 2,
  );
  const headContext = head.getContext('2d');
  if (!headContext) throw new Error('Cannot compose Alice hair');
  images.headComposite = {
    image: head as CanvasImageSource,
    layer: {
      x: rect.x - padding / rx,
      y: rect.y - padding / ry,
      width: head.width / rx,
      height: head.height / ry,
    },
    paint(frame) {
      headContext.setTransform(1, 0, 0, 1, 0, 0);
      headContext.clearRect(0, 0, head.width, head.height);
      headContext.setTransform(
        rx,
        0,
        0,
        ry,
        padding - rect.x * rx,
        padding - rect.y * ry,
      );
      headContext.imageSmoothingEnabled = true;
      // Bilinear sampling preserves disjoint cutouts on this native pixel grid
      // while allowing fractional hair motion. Wider filters create seams even
      // at 1:1. The finished head is downsampled at high quality by the renderer.
      headContext.imageSmoothingQuality = 'low';
      drawHeadLayers(headContext, images, { ...frame, definition });
    },
  };
  return images;
}
