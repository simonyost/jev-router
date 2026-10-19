import assert from 'node:assert/strict';
import test from 'node:test';
import { report } from '../src/router.mjs';

test('report compares only paired estimates without treating unknown costs or baselines as zero', () => {
  const entries = [
    { event: 'done', model: 'known', cost_usd: 1, baseline_usd: 3 },
    { event: 'done', model: 'unpriced', baseline_usd: 20, usage: { input: 1, cacheRead: 0, cacheWrite: 0, output: 1 } },
    { event: 'done', model: 'no-baseline', cost_usd: 4 },
    { event: 'done', model: 'missing-usage', status: 200 },
  ];
  const summary = report(entries.map((entry) => JSON.stringify(entry)));
  assert.equal(summary.cost_usd, 5, 'only known request costs enter the subtotal');
  assert.equal(summary.baseline_usd, 23, 'only known baselines enter the baseline subtotal');
  assert.equal(summary.saved_usd, 2, 'neither missing costs nor missing baselines invent a saving');
  assert.equal(summary.unpriced_responses, 2);
});

test('report retains real zero prices and negative paired savings', () => {
  const entries = [
    { event: 'done', model: 'free', cost_usd: 0, baseline_usd: 1 },
    { event: 'done', model: 'expensive', cost_usd: 4, baseline_usd: 1 },
  ];
  const summary = report(entries.map((entry) => JSON.stringify(entry)));
  assert.equal(summary.saved_usd, -2);
  assert.equal(summary.unpriced_responses, 0);
});
