import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    // Isolate each simulated document, including its shared logo/companion state.
    if (specifier === './alice-home-easter-egg') {
      const parent = new URL(context.parentURL);
      return next(
        new URL(`./alice-home-easter-egg.ts${parent.search}`, parent).href,
        context,
      );
    }
    return next(
      /^\.\/alice-[^.]+$/.test(specifier) ? `${specifier}.ts` : specifier,
      context,
    );
  },
});
async function documentFixture(name) {
  const { homeEasterEgg } = await import(
    `../models/alice/alice-home-easter-egg.ts?${name}`
  );
  const models = await import(`../models/alice/alice-models.ts?${name}`);
  return {
    home: homeEasterEgg,
    select: models.getDocumentAliceModel,
    release: models.releaseDocumentAlicePenguin,
  };
}
const nativeRandom = Math.random;
globalThis.window = { location: { hostname: 'example.test', search: '' } };
try {
  Math.random = () => 0.99;
  const first = await documentFixture('first-return');
  assert.equal(first.select('about'), 'sweater');
  assert.equal(
    first.home.request('about'),
    false,
    'Clicking the logo on Home does not arm or consume the guarantee',
  );
  assert.equal(first.select('about'), 'sweater');
  first.select('academic');
  assert.equal(first.home.request('academic'), true);
  assert.equal(
    first.select('about'),
    'penguin',
    'First valid logo return bypasses random selection',
  );
  first.home.encountered();
  assert.equal(first.select('projects'), 'penguin');
  first.release();
  assert.equal(
    first.select('digital'),
    'sweater',
    'Penguin must leave even when the probability roll is 99%',
  );
  assert.equal(
    first.home.request('digital'),
    false,
    'The guarantee is used only once',
  );
  assert.equal(
    first.select('about'),
    'sweater',
    'A later logo return uses normal odds',
  );

  const random = await documentFixture('already-seen');
  Math.random = () => 0;
  assert.equal(random.select('academic'), 'penguin');
  random.home.encountered();
  random.release();
  assert.equal(
    random.home.request('academic'),
    false,
    'Any prior visible penguin removes the guarantee',
  );
  assert.notEqual(random.select('about'), 'penguin');
  Math.random = () => 0.99;
  random.select('digital');
  assert.equal(
    random.home.request('digital'),
    false,
    'Leaving penguin does not restore the guarantee',
  );
  assert.notEqual(random.select('about'), 'penguin');

  const loading = await documentFixture('penguin-loading');
  Math.random = () => 0;
  assert.equal(loading.select('academic'), 'penguin');
  loading.home.request('academic');
  assert.equal(
    loading.select('about'),
    'penguin',
    'The lock protects penguin even before its arrival callback',
  );
  loading.release();
  assert.notEqual(loading.select('academic'), 'penguin');
  assert.equal(
    loading.home.request('digital'),
    false,
    'The conflicting first valid return still consumes the guarantee',
  );

  const lazy = await documentFixture('before-companion');
  Math.random = () => 0.99;
  assert.equal(lazy.home.request('photography'), true);
  assert.equal(
    lazy.select('about'),
    'penguin',
    'Logo return before the companion loads must survive lazy loading',
  );

  const cancelled = await documentFixture('cancelled-return');
  cancelled.select('academic');
  cancelled.home.request('academic');
  assert.equal(cancelled.select('digital'), 'sweater');
  assert.equal(
    cancelled.select('about'),
    'sweater',
    'An abandoned logo return cannot trigger a later unrelated navigation',
  );
  assert.equal(cancelled.home.request('about'), false);
  cancelled.select('academic');
  assert.equal(cancelled.home.request('academic'), true);
  assert.equal(
    cancelled.select('about'),
    'penguin',
    'An unconsumed opportunity survives until a real logo return',
  );
  console.log(
    'PASS: logo-only first return, no-op on Home, prior random encounter consumes guarantee, mandatory penguin departure, conflict consumption, lazy loading and abandoned navigation.',
  );
} finally {
  Math.random = nativeRandom;
  delete globalThis.window;
}
