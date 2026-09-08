import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({
  resolve(specifier, context, next) {
    return next(
      /^\.\/alice-[^.]+$/.test(specifier) ? `${specifier}.ts` : specifier,
      context,
    );
  },
});
const { ALICE_MODELS } = await import('../models/alice/alice-models.ts');
const { getAliceExpressions, pickAliceExpression, pickAliceIdlePose } =
  await import('../models/alice/alice-expressions.ts');
const { default: map } = await import('../models/alice/alice-affect-map.json', {
  with: { type: 'json' },
});
const samples = 1000;
let weightedNegative = 0,
  uniformNegative = 0;
for (const [model, config] of Object.entries(ALICE_MODELS)) {
  for (const pose of config.poses) {
    const faces = getAliceExpressions(model, pose);
    const negative = (id) =>
      Boolean(
        map[model][pose][id].emotions.angry ||
        map[model][pose][id].emotions.annoyed,
      );
    const calm = faces.filter((face) => !negative(face.id));
    for (const current of [undefined, ...faces.map((face) => face.id)]) {
      let selectedNegative = 0;
      for (let i = 0; i < samples; i++) {
        const id = pickAliceExpression(
          model,
          pose,
          current,
          () => (i + 0.5) / samples,
        );
        assert(faces.some((face) => face.id === id));
        assert(
          !negative(id) || map[model][pose][id].intensity[0] < 0.8,
          'Extreme anger must never appear at idle',
        );
        if (calm.some((face) => face.id !== current))
          assert.notEqual(id, current);
        if (negative(id)) selectedNegative++;
      }
      if (calm.length)
        assert(
          selectedNegative / samples < 0.15,
          `${model}/${pose}: anger must remain rare even after a calm face`,
        );
      if (current === undefined && calm.length) {
        weightedNegative += selectedNegative / samples;
        uniformNegative +=
          faces.filter((face) => negative(face.id)).length / faces.length;
      }
    }
  }
}
assert(
  weightedNegative < uniformNegative * 0.12,
  'Idle anger frequency falls by more than 88% across eligible pose groups',
);
let leaning = 0;
for (let i = 0; i < 10000; i++) {
  if (
    pickAliceIdlePose(
      'winter',
      ALICE_MODELS.winter.poses,
      'idle',
      () => (i + 0.5) / 10000,
    ) === 'leaning'
  )
    leaning++;
}
assert(leaning < 100, 'An all-irritated pose is also rare, below 1%');
console.log(
  `PASS: calm-first weighted idle draws, no forced anger repeats, extreme faces excluded, all-negative pose suppression (${(100 * (1 - weightedNegative / uniformNegative)).toFixed(1)}% lower mean negative frequency).`,
);
