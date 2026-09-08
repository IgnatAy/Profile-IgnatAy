export const ALICE_EMOTIONS = [
  'neutral',
  'attentive',
  'thinking',
  'pleased',
  'proud',
  'shy',
  'surprised',
  'annoyed',
  'angry',
] as const;

export type AliceEmotion = (typeof ALICE_EMOTIONS)[number];
export type AliceEmotionCue = { emotion: AliceEmotion; intensity: number };

export function isAliceEmotion(value: string): value is AliceEmotion {
  return (ALICE_EMOTIONS as readonly string[]).includes(value);
}

export const ALICE_NEUTRAL: AliceEmotionCue = {
  emotion: 'neutral',
  intensity: 0.3,
};
