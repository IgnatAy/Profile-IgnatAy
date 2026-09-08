import type { AliceModel } from './alice-models';
import type { AlicePose } from './alice-poses';

// Full-body previews retain room for the complete outfit and motion.
export const ALICE_SIDE_PADDING_RATIO = .06;

// Winter and sweater portraits used a padded width/height ratio of ~.36.
// A .33 reference makes them about 9% larger without shrinking wider outfits.
const PORTRAIT_WIDTH_RATIO = .33;
const PORTRAIT_HEIGHT_RATIO = 2.1;
// The companion must end above the lower legs, even on tall/revealed layouts.
const PORTRAIT_BOTTOM_RATIO = .72;

// Only poses whose outfit crosses the portrait frame need a wider surface.
// Keep this tied to the displayed pose so loading a new rig cannot move the old one.
const WIDE_PORTRAITS: Record<AliceModel, readonly AlicePose[]> = {
  winter: ['leaning', 'shy'],
  cape: ['idle', 'relaxed', 'profile', 'shy', 'leaning'],
  dress: ['hand-over-mouth', 'relaxed', 'shy', 'tea'],
  cloak: ['hand-over-mouth', 'idle', 'relaxed', 'profile', 'shy', 'leaning'],
  penguin: ['idle'],
  sweater: ['shy'],
};

export function aliceNeedsWidePortrait(model: AliceModel, pose: AlicePose) {
  return WIDE_PORTRAITS[model].includes(pose);
}

// Match the authored leaning/profile centers in the rig manifests when a
// sprite is displayed before the rig is ready or after a texture failure.
const PORTRAIT_CENTERS: Partial<Record<AliceModel, Partial<Record<AlicePose, number>>>> = {
  winter: { shy: 540 / 1591, leaning: 675 / 1591, profile: 820 / 1308 },
  cape: { shy: 735 / 2128, leaning: 650 / 2040, profile: 1240 / 1777 },
  cloak: { shy: 745 / 2128, leaning: 657 / 2040, profile: 1230 / 1777 },
  dress: { shy: 710 / 2038 },
  sweater: { shy: 560 / 1509 },
};

export function aliceSpriteCenterRatio(model: AliceModel, pose: AlicePose) {
  return PORTRAIT_CENTERS[model]?.[pose] ?? .5;
}

export function aliceFraming(
  width: number,
  height: number,
  source: { width: number; height: number; centerX?: number },
  fullBody: boolean,
  portraitHeight = height,
  portraitWidth = width,
) {
  const referenceHeight = fullBody ? height : portraitHeight;
  const top = referenceHeight * .08;
  // A wider canvas reveals the outfit without changing portrait scale.
  const availableWidth = Math.max(1, (fullBody ? width : portraitWidth) - 16);
  const sidePadding = source.height * ALICE_SIDE_PADDING_RATIO;
  const scale = fullBody
    ? Math.min(height * .87 / source.height, availableWidth / (source.width + sidePadding * 2))
    : Math.max(
        Math.min(referenceHeight * PORTRAIT_HEIGHT_RATIO,
          availableWidth / PORTRAIT_WIDTH_RATIO) / source.height,
        (height - top) / (source.height * PORTRAIT_BOTTOM_RATIO),
      );
  // Portraits are centered on the authored upper body; a wide skirt must not
  // pull a leaning face sideways or force the whole figure to become smaller.
  const centerX = fullBody ? source.width / 2 : (source.centerX ?? source.width / 2);
  return { scale, left: width / 2 - centerX * scale, top };
}
