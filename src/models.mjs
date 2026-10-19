// Claude API capabilities used when adapting a Claude Code request to a configured target.
// Keep prices in config: installations can override them without changing routing code.

/**
 * @typedef {object} ModelCapabilities
 * @property {number} contextTokens
 * @property {number} maxOutputTokens
 * @property {boolean} systemMessages whether role: system is accepted inside messages
 * @property {string[]} omitBetas beta headers rejected by this model
 * @property {'manual' | 'adaptive' | 'always-adaptive'} thinking
 * @property {string[]} acceptedThinkingTypes
 * @property {boolean} forcedTools whether tool_choice any/tool is accepted
 * @property {boolean} restrictSampling whether non-default sampling parameters are rejected
 * @property {boolean} prefill whether a final assistant prefill is accepted
 * @property {string[]} rejectedToolTypes Claude API tool types this model rejects
 */

// Sources (checked 2026-10-18):
// https://platform.claude.com/docs/en/models/overview
// https://platform.claude.com/docs/en/models/haiku-5-5/overview
// https://platform.claude.com/docs/en/models/sonnet-5-5/overview
// https://platform.claude.com/docs/en/models/opus-5-5/overview
// https://platform.claude.com/docs/en/build-with-claude/thinking
/** @type {Readonly<Record<string, Readonly<ModelCapabilities>>>} */
export const CLAUDE_MODELS = Object.freeze({
  'claude-haiku-4-5': {
    contextTokens: 200000,
    maxOutputTokens: 64000,
    systemMessages: false,
    omitBetas: ['context-1m-2025-08-07'],
    thinking: 'manual',
    acceptedThinkingTypes: ['enabled', 'disabled'],
    forcedTools: true,
    restrictSampling: false,
    prefill: true,
    rejectedToolTypes: [],
  },
  'claude-sonnet-5': {
    contextTokens: 1000000,
    maxOutputTokens: 128000,
    systemMessages: true,
    omitBetas: [],
    thinking: 'adaptive',
    acceptedThinkingTypes: ['adaptive', 'disabled'],
    forcedTools: true,
    restrictSampling: true,
    prefill: false,
    rejectedToolTypes: [],
  },
  'claude-opus-5-5': {
    contextTokens: 1000000,
    maxOutputTokens: 128000,
    systemMessages: true,
    omitBetas: [],
    thinking: 'always-adaptive',
    acceptedThinkingTypes: ['adaptive'],
    forcedTools: false,
    restrictSampling: true,
    prefill: false,
    rejectedToolTypes: ['computer_20250124', 'computer_20251124'],
  },
  'claude-sonnet-5-5': {
    contextTokens: 1000000,
    maxOutputTokens: 128000,
    systemMessages: true,
    omitBetas: [],
    thinking: 'adaptive',
    acceptedThinkingTypes: ['adaptive', 'between_tools'],
    forcedTools: false,
    restrictSampling: true,
    prefill: false,
    rejectedToolTypes: ['computer_20250124', 'computer_20251124'],
  },
  'claude-haiku-5-5': {
    contextTokens: 1000000,
    maxOutputTokens: 128000,
    systemMessages: true,
    omitBetas: [],
    thinking: 'adaptive',
    acceptedThinkingTypes: ['adaptive', 'disabled'],
    forcedTools: true,
    restrictSampling: true,
    prefill: false,
    rejectedToolTypes: ['computer_20250124', 'computer_20251124'],
  },
  'claude-fable-5-1': {
    contextTokens: 1000000,
    maxOutputTokens: 128000,
    systemMessages: true,
    omitBetas: [],
    thinking: 'always-adaptive',
    acceptedThinkingTypes: ['adaptive'],
    forcedTools: false,
    restrictSampling: true,
    prefill: false,
    rejectedToolTypes: [],
  },
});

/**
 * Known Claude API identities, including dated Haiku 4.5 snapshots. Unknown models keep the
 * target's explicit overrides and are otherwise passed through so the upstream can decide.
 * @param {string} id
 * @returns {Readonly<ModelCapabilities> | undefined}
 */
export function modelCapabilities(id) {
  if (Object.hasOwn(CLAUDE_MODELS, id)) return CLAUDE_MODELS[id];
  if (/^claude-haiku-4-5-\d{8}$/.test(id)) return CLAUDE_MODELS['claude-haiku-4-5'];
  return undefined;
}
