import annotations from './alice-affect-map.json';
import { getAliceExpressions } from './alice-expressions';
import { ALICE_MODELS, type AliceModel } from './alice-models';
import type { AlicePose } from './alice-poses';
import type { AliceEmotion, AliceEmotionCue } from '../../lib/alice-emotions';

export type AliceAffectAnnotation = {
  emotions: Partial<Record<AliceEmotion, number>>;
  intensity: [number, number];
  cues: string[];
  note?: string;
};
export const ALICE_AFFECT_MAP = annotations as unknown as Record<
  AliceModel,
  Partial<Record<AlicePose, Record<string, AliceAffectAnnotation>>>
>;
export type AliceAppearance = {
  pose: AlicePose;
  expressionId: string;
  resolvedEmotion: AliceEmotion;
};
const fallback: Record<AliceEmotion, AliceEmotion[]> = {
  neutral: ['neutral'],
  attentive: ['attentive', 'neutral'],
  thinking: ['thinking', 'attentive', 'neutral'],
  pleased: ['pleased', 'neutral'],
  proud: ['proud', 'pleased', 'neutral'],
  shy: ['shy', 'pleased', 'neutral'],
  surprised: ['surprised', 'attentive', 'neutral'],
  annoyed: ['annoyed', 'neutral'],
  angry: ['angry', 'annoyed', 'neutral'],
};

/** Semantic selection always stays inside the selected outfit's real catalog. */
export function pickAliceAppearance(
  model: AliceModel,
  cue: AliceEmotionCue,
  previous?: AliceAppearance,
  random: () => number = Math.random,
): AliceAppearance {
  const choices = ALICE_MODELS[model].poses.flatMap((pose) =>
    getAliceExpressions(model, pose).map((expression) => ({
      pose,
      expressionId: expression.id,
      annotation: ALICE_AFFECT_MAP[model]?.[pose]?.[expression.id],
    })),
  );
  // Red eyes and full-face shadows are reserved for their annotated high
  // intensity, never selected as the nearest match to mild irritation.
  const eligible = choices.filter(
    (choice) =>
      !choice.annotation ||
      choice.annotation.intensity[0] < 0.8 ||
      cue.intensity >= choice.annotation.intensity[0],
  );
  const resolvedEmotion =
    fallback[cue.emotion].find((emotion) =>
      eligible.some(
        (choice) => (choice.annotation?.emotions[emotion] ?? 0) > 0,
      ),
    ) ?? 'neutral';
  const candidates = eligible
    .flatMap((choice) => {
      const weight = choice.annotation?.emotions[resolvedEmotion] ?? 0;
      if (!choice.annotation || !weight) return [];
      const [low, high] = choice.annotation.intensity;
      const distance = Math.max(low - cue.intensity, cue.intensity - high, 0);
      const repeat =
        previous?.expressionId === choice.expressionId &&
        previous.pose === choice.pose;
      return [
        {
          ...choice,
          score:
            weight * 0.75 +
            (1 - distance) * 0.2 +
            (previous?.pose === choice.pose ? 0.05 : 0) -
            (repeat ? 0.16 : 0),
        },
      ];
    })
    .sort((a, b) => b.score - a.score);
  const best = candidates[0]?.score ?? 0;
  const pool = candidates
    .filter((candidate) => candidate.score >= best - 0.12)
    .slice(0, 3);
  const total = pool.reduce((sum, candidate) => sum + candidate.score, 0);
  let roll = Math.max(0, Math.min(0.999999, random())) * total;
  const selected =
    pool.find((candidate) => {
      roll -= candidate.score;
      return roll < 0;
    }) ??
    candidates[0] ??
    choices[0];
  return {
    pose: selected.pose,
    expressionId: selected.expressionId,
    resolvedEmotion,
  };
}
