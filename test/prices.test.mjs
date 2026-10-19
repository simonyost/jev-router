import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateConfig } from '../src/config.mjs';

const shipped = JSON.parse(readFileSync(new URL('../config/anthropic-only.json', import.meta.url), 'utf8'));

test('price validation accepts duration and configurable context rates without mutating input', () => {
  const prices = {
    custom: {
      in: 0.1,
      out: 0.5,
      cacheWrite1h: 0.2,
      longContext: { aboveInputTokens: 100000, in: 0.5, out: 2.5, cacheRead: 0.05, cacheWrite: 0.625, cacheWrite1h: 1 },
    },
  };
  const validated = validateConfig({ ...shipped, prices });
  assert.deepEqual(validated.prices, prices);
  assert.notEqual(validated.prices, prices);
});

test('price validation collects malformed rates and context thresholds', () => {
  for (const prices of [[], 'free', { broken: null }, { broken: 5 }]) assert.throws(() => validateConfig({ ...shipped, prices }), /prices/);
  for (const value of [-1, Infinity, NaN, '1'])
    assert.throws(() => validateConfig({ ...shipped, prices: { broken: { in: value, out: 1 } } }), /prices.broken.in/);
  assert.throws(() => validateConfig({ ...shipped, prices: { broken: { in: 1 } } }), /prices.broken.out/);
  for (const longContext of [null, [], 'high', { aboveInputTokens: 0, in: 1, out: 2 }, { aboveInputTokens: 10, in: 1 }])
    assert.throws(() => validateConfig({ ...shipped, prices: { broken: { in: 1, out: 2, longContext } } }), /longContext/);
  assert.throws(
    () => validateConfig({ ...shipped, prices: { broken: { in: -1, out: -2, cacheRead: -1, cacheWrite: -2, cacheWrite1h: -3 } } }),
    /in[\s\S]*out[\s\S]*cacheRead[\s\S]*cacheWrite[\s\S]*cacheWrite1h/,
  );
});
