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

export function pickAliceModel(random: () => number = Math.random): AliceModel {
  return ALICE_MODEL_IDS[Math.floor(random() * ALICE_MODEL_IDS.length)];
}

// Document lifetime only: rerenders/remounts keep the outfit, reloads draw again.
// The server never selects or persists a visitor's model.
let documentModel: AliceModel | undefined;
export function getDocumentAliceModel(): AliceModel {
  if (typeof window === 'undefined') return 'winter';
  return (documentModel ??= pickAliceModel());
}
