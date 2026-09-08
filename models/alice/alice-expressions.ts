import catalog from './native-expressions.json' with { type: 'json' };
import annotations from './alice-affect-map.json' with { type: 'json' };
import type { AliceModel } from './alice-models';
import type { AlicePose } from './alice-poses';

export type AliceExpression = {
  id: string;
  source: string;
  sprite: string;
  aliases?: string[];
  rigDirectory?: string;
  patch?: {
    left: number;
    top: number;
    width: number;
    height: number;
    runtimeFile: string;
    maskFile: string;
  };
};
const expressions = catalog as Record<
  AliceModel,
  Partial<Record<AlicePose, AliceExpression[]>>
>;
export function getAliceExpressions(
  model: AliceModel,
  pose: AlicePose,
): readonly AliceExpression[] {
  const result = expressions[model][pose];
  if (!result?.length)
    throw new Error(`Unsupported Alice expression pose: ${model}/${pose}`);
  return result;
}
export function getAliceExpression(
  model: AliceModel,
  pose: AlicePose,
  id?: string,
): AliceExpression {
  const choices = getAliceExpressions(model, pose);
  return choices.find((choice) => choice.id === id) ?? choices[0];
}
const idleAnnotations = annotations as Record<
  string,
  Record<
    string,
    Record<
      string,
      {
        emotions: { annoyed?: number; angry?: number };
        intensity: number[];
      }
    >
  >
>;

export function aliceIdleExpressionWeight(
  model: AliceModel,
  pose: AlicePose,
  id: string,
): number {
  const annotation = idleAnnotations[model]?.[pose]?.[id];
  if (!annotation?.emotions.annoyed && !annotation?.emotions.angry) return 1;
  // Supernatural rage is a conversation reaction, never a casual idle face.
  return annotation.intensity[0] >= 0.8 ? 0 : 0.04;
}

function pickWeighted<T>(
  choices: { value: T; weight: number }[],
  random: () => number,
): T {
  const total = choices.reduce((sum, choice) => sum + choice.weight, 0);
  let roll = Math.max(0, Math.min(0.999999, random())) * total;
  return (
    choices.find((choice) => {
      roll -= choice.weight;
      return roll < 0;
    }) ?? choices[choices.length - 1]
  ).value;
}

/** Prefer a different calm face; never force anger just to avoid a repeat. */
export function pickAliceExpression(
  model: AliceModel,
  pose: AlicePose,
  current?: string,
  random: () => number = Math.random,
): string {
  const choices = getAliceExpressions(model, pose);
  const weighted = choices
    .map((choice) => ({
      value: choice.id,
      weight: aliceIdleExpressionWeight(model, pose, choice.id),
    }))
    .filter((choice) => choice.weight > 0);
  const hasOtherCalm = weighted.some(
    (choice) => choice.value !== current && choice.weight === 1,
  );
  const rest = weighted.filter(
    (choice) =>
      choice.value !== current || (!hasOtherCalm && choice.weight === 1),
  );
  return pickWeighted(rest.length ? rest : weighted, random);
}

export function pickAliceIdlePose(
  model: AliceModel,
  poses: readonly AlicePose[],
  current: AlicePose,
  random: () => number = Math.random,
): AlicePose {
  const choices = poses
    .filter((pose) => pose !== current)
    .map((pose) => ({
      value: pose,
      weight: Math.max(
        ...getAliceExpressions(model, pose).map((choice) =>
          aliceIdleExpressionWeight(model, pose, choice.id),
        ),
      ),
    }))
    .filter((choice) => choice.weight > 0);
  return choices.length ? pickWeighted(choices, random) : current;
}
export function aliceExpressionDelay(
  random: () => number = Math.random,
): number {
  return 4000 + random() * 4000;
}
