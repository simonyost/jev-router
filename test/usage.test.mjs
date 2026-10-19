import assert from 'node:assert/strict';
import test from 'node:test';
import { costOf, UsageTap } from '../src/usage.mjs';

const prices = {
  'claude-haiku-5-5': {
    in: 0.1,
    out: 0.5,
    cacheRead: 0.01,
    cacheWrite: 0.125,
    cacheWrite1h: 0.2,
    longContext: {
      aboveInputTokens: 100000,
      in: 0.5,
      out: 2.5,
      cacheRead: 0.05,
      cacheWrite: 0.625,
      cacheWrite1h: 1,
    },
  },
  'claude-sonnet-5-5': { in: 2, out: 10, cacheRead: 0.1, cacheWrite: 2.5, cacheWrite1h: 4 },
  'claude-opus-5-5': { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5, cacheWrite1h: 8 },
};

/** @param {import('../src/types.js').RawUsage & { cache_creation?: { ephemeral_5m_input_tokens?: number, ephemeral_1h_input_tokens?: number }, server_tool_use?: Record<string, number>, inference_geo?: string }} raw */
function tap(raw) {
  const reader = new UsageTap('application/json');
  reader.push(Buffer.from(JSON.stringify({ model: 'claude-haiku-5-5', usage: raw })));
  return reader.result();
}

test('cache write duration split prices 5-minute and 1-hour tokens separately without changing logged usage', () => {
  const usage = tap({
    input_tokens: 1000,
    cache_read_input_tokens: 2000,
    cache_creation_input_tokens: 3000,
    cache_creation: { ephemeral_5m_input_tokens: 1000, ephemeral_1h_input_tokens: 2000 },
    output_tokens: 100,
  });
  assert.deepEqual(usage, { input: 1000, cacheRead: 2000, cacheWrite: 3000, output: 100 });
  assert.equal(JSON.stringify(usage), '{"input":1000,"cacheRead":2000,"cacheWrite":3000,"output":100}');
  assert.equal(costOf('claude-haiku-5-5', usage, prices), 0.000695);
  assert.equal(costOf('claude-sonnet-5-5', usage, prices), 0.0137);
  assert.equal(costOf('claude-opus-5-5', usage, prices), 0.0274);
});

test('Haiku long-context pricing uses total prompt tokens and charges the whole request at the higher rate', () => {
  const exact = tap({ input_tokens: 1, cache_read_input_tokens: 99999, output_tokens: 10 });
  const over = tap({ input_tokens: 1, cache_read_input_tokens: 100000, output_tokens: 10 });
  assert.equal(costOf('claude-haiku-5-5', exact, prices), 0.001005);
  assert.equal(costOf('claude-haiku-5-5', over, prices), 0.005026);
});

test('pricing is unavailable for incomplete or ambiguous usage', () => {
  const missingOutput = tap({ input_tokens: 20 });
  assert.deepEqual(missingOutput, { input: 20, cacheRead: 0, cacheWrite: 0, output: 0 });
  assert.equal(costOf('claude-haiku-5-5', missingOutput, prices), undefined);
  const unknownDuration = tap({ input_tokens: 20, cache_creation_input_tokens: 10, output_tokens: 2 });
  assert.equal(costOf('claude-haiku-5-5', unknownDuration, prices), undefined);
  const inconsistent = tap({
    input_tokens: 20,
    cache_creation_input_tokens: 10,
    cache_creation: { ephemeral_5m_input_tokens: 4, ephemeral_1h_input_tokens: 5 },
    output_tokens: 2,
  });
  assert.equal(costOf('claude-haiku-5-5', inconsistent, prices), undefined);
  const hourOnly = tap({
    input_tokens: 20,
    cache_creation: { ephemeral_1h_input_tokens: 10 },
    output_tokens: 2,
  });
  assert.deepEqual(hourOnly, { input: 20, cacheRead: 0, cacheWrite: 10, output: 2 });
  assert.equal(costOf('claude-haiku-5-5', hourOnly, prices), 0.000005);
  assert.equal(costOf('claude-haiku-5-5', hourOnly, { 'claude-haiku-5-5': { in: 0.1, out: 0.5 } }), undefined);
  assert.equal(costOf('claude-haiku-5-5', { input: -1, cacheRead: 0, cacheWrite: 0, output: 0 }, prices), undefined);
  assert.equal(costOf('unknown', { input: 1, cacheRead: 0, cacheWrite: 0, output: 1 }, prices), undefined);
  assert.equal(costOf('claude-haiku-5-5', tap({ input_tokens: 1, output_tokens: 1 }), prices, { unpricedModifiers: true }), undefined);
  assert.equal(
    costOf('claude-haiku-5-5', tap({ input_tokens: 1, output_tokens: 1, server_tool_use: { web_search_requests: 1 } }), prices),
    undefined,
  );
  assert.equal(costOf('claude-haiku-5-5', tap({ input_tokens: 1, output_tokens: 1, inference_geo: 'us' }), prices), undefined);
});

test('usage from streaming events retains cache duration details for pricing', () => {
  const reader = new UsageTap('text/event-stream');
  reader.push(
    Buffer.from(
      'data: {"type":"message_start","message":{"model":"claude-haiku-5-5","usage":{"input_tokens":1,"cache_creation_input_tokens":2,"cache_creation":{"ephemeral_5m_input_tokens":1,"ephemeral_1h_input_tokens":1}}}}\n\n',
    ),
  );
  reader.push(Buffer.from('data: {"type":"message_delta","usage":{"output_tokens":3}}\n\n'));
  assert.equal(costOf('claude-haiku-5-5', reader.result(), prices), 0.000002);
});
