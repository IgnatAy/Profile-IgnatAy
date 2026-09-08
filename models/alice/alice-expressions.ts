import catalog from './native-expressions.json' with { type: 'json' };
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
/** Every native expression is eligible; consecutive draws do not repeat. */
export function pickAliceExpression(
  model: AliceModel,
  pose: AlicePose,
  current?: string,
  random: () => number = Math.random,
): string {
  const choices = getAliceExpressions(model, pose);
  const rest = choices.filter((choice) => choice.id !== current);
  const pool = rest.length ? rest : choices;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))].id;
}
export function aliceExpressionDelay(
  random: () => number = Math.random,
): number {
  return 4000 + random() * 4000;
}
