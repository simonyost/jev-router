import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CLAUDE_MODELS, modelCapabilities } from '../src/models.mjs';

/** @param {string} name */
const packaged = (name) => JSON.parse(readFileSync(new URL(`../config/${name}.json`, import.meta.url), 'utf8'));

test('shipped Claude targets use known model capabilities and current Haiku, Sonnet and Opus defaults', () => {
  for (const name of ['default', 'anthropic-only', 'anthropic-fable']) {
    const cfg = packaged(name);
    for (const target of Object.values(cfg.surfaces.anthropic)) {
      if (target.url !== 'https://api.anthropic.com') continue;
      assert.ok(modelCapabilities(target.model), `${name}: ${target.model} needs capabilities`);
    }
    assert.equal(cfg.surfaces.anthropic.side.model, 'claude-haiku-5-5');
    assert.equal(cfg.surfaces.anthropic.balanced.model, 'claude-sonnet-5-5');
    assert.equal(cfg.surfaces.anthropic.trusted.model, 'claude-sonnet-5-5');
    assert.equal(cfg.surfaces.anthropic.frontier.model, 'claude-opus-5-5');
    if (name !== 'default') assert.equal(cfg.surfaces.anthropic.fast.model, 'claude-haiku-5-5');
    else assert.equal(cfg.surfaces.anthropic.fast.url, 'https://ollama.com');
  }
});

test('the registry has output, thinking and system-message behavior for current and historical models', () => {
  for (const id of ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5']) {
    const model = CLAUDE_MODELS[id];
    assert.equal(model.contextTokens, 1_000_000);
    assert.equal(model.maxOutputTokens, 128_000);
    assert.equal(model.systemMessages, true);
    assert.notEqual(model.thinking, 'manual');
  }
  assert.equal(modelCapabilities('claude-haiku-4-5-20251001')?.maxOutputTokens, 64_000);
  assert.equal(modelCapabilities('claude-haiku-4-5')?.systemMessages, false);
  assert.equal(modelCapabilities('claude-unlisted-9'), undefined);
});
