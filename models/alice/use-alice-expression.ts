import { useEffect, useState } from 'react';
import {
  aliceExpressionDelay,
  getAliceExpression,
  getAliceExpressions,
  pickAliceExpression,
} from './alice-expressions';
import type { AliceModel } from './alice-models';
import type { AlicePose } from './alice-poses';

/** A separate clock lets one pose keep moving while its expression changes. */
export function useAliceExpression(
  model: AliceModel,
  pose: AlicePose,
  motion: boolean,
  visible: boolean,
) {
  const key = `${model}:${pose}`;
  const [selection, setSelection] = useState<{
    key: string;
    id: string;
  } | null>(null);
  useEffect(() => {
    const initial = setTimeout(
      () => setSelection({ key, id: pickAliceExpression(model, pose) }),
      0,
    );
    return () => clearTimeout(initial);
  }, [model, pose, key]);
  useEffect(() => {
    if (!motion || !visible || getAliceExpressions(model, pose).length < 2)
      return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setSelection((current) => ({
          key,
          id: pickAliceExpression(
            model,
            pose,
            current?.key === key ? current.id : undefined,
          ),
        }));
        schedule();
      }, aliceExpressionDelay());
    };
    schedule();
    return () => clearTimeout(timer);
  }, [model, pose, key, motion, visible]);
  return getAliceExpression(
    model,
    pose,
    selection?.key === key ? selection.id : undefined,
  );
}
