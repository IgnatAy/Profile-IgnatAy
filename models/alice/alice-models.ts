import { homeEasterEgg } from './alice-home-easter-egg';
import {
  ALICE_ASSET_REVISION,
  ALICE_POSES,
  ALICE_DRESS_POSES,
  ALICE_CLOAK_POSES,
  ALICE_SWEATER_POSES,
  type AlicePose,
} from './alice-poses';

/** Outfit selection is separate from the poses available within each outfit. */
export const ALICE_MODELS = {
  winter: {
    assetBase: './models/alice',
    revision: ALICE_ASSET_REVISION,
    poses: ALICE_POSES as readonly AlicePose[],
  },
  cape: {
    assetBase: './models/alice-cape',
    revision: 'cape-expressions-20260908-1',
    poses: [
      'idle',
      'relaxed',
      'side',
      'side-folded',
      'profile',
      'shy',
      'leaning',
    ] as readonly AlicePose[],
  },
  dress: {
    assetBase: './models/alice-dress',
    revision: 'dress-expressions-20260908-1',
    poses: ALICE_DRESS_POSES as readonly AlicePose[],
  },
  cloak: {
    assetBase: './models/alice-cloak',
    revision: 'cloak-expressions-20260908-1',
    poses: ALICE_CLOAK_POSES as readonly AlicePose[],
  },
  penguin: {
    assetBase: './models/alice-penguin',
    revision: 'penguin-native-20260908-1',
    poses: ['idle'] as readonly AlicePose[],
  },
  sweater: {
    assetBase: './models/alice-sweater',
    revision: 'sweater-expressions-20260908-2',
    poses: ALICE_SWEATER_POSES as readonly AlicePose[],
  },
} as const;
export type AliceModel = keyof typeof ALICE_MODELS;
export const ALICE_MODEL_IDS = Object.keys(ALICE_MODELS) as AliceModel[];

export const ALICE_MODEL_CHANGE_CHANCE = 0.6;
export const ALICE_PENGUIN_CHANCE = 0.05;

// Draw a different outfit when switching. Penguin retains its own 5% bucket;
// the remaining probability is shared equally by eligible ordinary outfits.
export function pickAliceModel(
  random: () => number = Math.random,
  current?: AliceModel,
): AliceModel {
  const roll = random();
  const penguinChance = current === 'penguin' ? 0 : ALICE_PENGUIN_CHANCE;
  if (roll < penguinChance) return 'penguin';
  const ordinary = ALICE_MODEL_IDS.filter(
    (model) => model !== 'penguin' && model !== current,
  );
  const index = Math.floor(
    ((roll - penguinChance) / (1 - penguinChance)) * ordinary.length,
  );
  return ordinary[Math.min(index, ordinary.length - 1)];
}

export function pickNextAliceModel(
  current: AliceModel,
  random: () => number = Math.random,
): AliceModel {
  // Penguin is a brief encounter: any real page change must leave this outfit.
  if (current === 'penguin') return pickAliceModel(random, current);
  return random() < ALICE_MODEL_CHANGE_CHANCE
    ? pickAliceModel(random, current)
    : current;
}

// Explicit local preview only. The deployed site always uses normal odds.
export function isAliceEasterEggPreview(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) &&
    new URLSearchParams(window.location.search).get('alice-easter-egg') ===
      'preview'
  );
}

// A resolved section change gets one roll, including browser back/forward.
// Rerenders, language changes and remounts on the same section do not reroll.
let documentModel: AliceModel | undefined;
let documentSection: string | undefined;
export function getDocumentAliceModel(section?: string): AliceModel {
  if (typeof window === 'undefined') return 'winter';
  const preview = isAliceEasterEggPreview();
  const guaranteed = homeEasterEgg.take(section, documentModel !== 'penguin');
  if (guaranteed) documentModel = 'penguin';
  else if (!documentModel)
    documentModel = preview ? 'penguin' : pickAliceModel();
  else if (
    section !== undefined &&
    documentSection !== undefined &&
    section !== documentSection
  )
    documentModel =
      documentModel === 'penguin'
        ? pickNextAliceModel(documentModel)
        : preview
          ? 'penguin'
          : pickNextAliceModel(documentModel);
  if (section !== undefined) documentSection = section;
  return documentModel;
}
