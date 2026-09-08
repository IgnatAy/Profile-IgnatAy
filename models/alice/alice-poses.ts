/** Shared by the companion, asset loader, optional controller and offline checks. */
export const ALICE_POSES = [
  'idle',
  'thinking',
  'front',
  'shy',
  'relaxed',
  'side',
  'side-folded',
  'profile',
  'leaning',
] as const;
export const ALICE_DRESS_POSES = [
  'idle',
  'thinking',
  'relaxed',
  'hand-over-mouth',
  'side',
  'side-folded',
  'shy',
  'tea',
] as const;
export const ALICE_CLOAK_POSES = [
  'idle',
  'thinking',
  'relaxed',
  'front',
  'hand-over-mouth',
  'side',
  'side-folded',
  'profile',
  'shy',
  'leaning',
] as const;
export const ALICE_SWEATER_POSES = [
  'idle',
  'thinking',
  'relaxed',
  'hand-over-mouth',
  'side',
  'side-folded',
  'shy',
] as const;
export type AlicePose =
  | (typeof ALICE_POSES)[number]
  | (typeof ALICE_DRESS_POSES)[number]
  | (typeof ALICE_CLOAK_POSES)[number]
  | (typeof ALICE_SWEATER_POSES)[number];
export const ALICE_ASSET_REVISION = 'native-expressions-20260908-2';
