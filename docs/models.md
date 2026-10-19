# Claude models, prices and upgrades

Verified against official Anthropic documentation on 2026-10-18. These are documentation and mock-test
results, not live account-access or end-to-end coding-quality measurements.

## Supported defaults

| Tier | Claude API ID | Context | Maximum output |
| --- | --- | --- | --- |
| `fast`, `side` | `claude-haiku-5-5` | 1M | 128K |
| `balanced`, `trusted` | `claude-sonnet-5-5` | 1M | 128K |
| `frontier` | `claude-opus-5-5` | 1M | 128K |
| `max`, optional Fable config | `claude-fable-5-1` | 1M | 128K |

The requested 5.5 models are officially documented; no invented IDs or aliases are needed.
See the official [Haiku](https://platform.claude.com/docs/en/models/haiku-5-5/overview),
[Sonnet](https://platform.claude.com/docs/en/models/sonnet-5-5/overview) and
[Opus](https://platform.claude.com/docs/en/models/opus-5-5/overview) specifications.
Availability still depends on your provider, credentials and account. Claude Code subscription access is
not established by an API model page. Requests denied by the upstream retain the upstream error body;
the router does not silently substitute a model or provider.

`setup` defaults to the Claude-only config. The optional Ollama config retains its existing non-Claude
fast tier. Codex's Responses targets and Jev's classification rubric are unchanged.

## Configure and verify routing

For a new configuration:

```bash
jev-router init --models claude
jev-router doctor
jev-router launch claude --ui 4100
```

`init` refuses to overwrite an existing config. For an existing installation, back up the configuration
first and follow the migration steps below. Customize `surfaces.anthropic.<tier>.model` in that copy.
A verified target example from the packaged Claude config is:

```json
{
  "url": "https://api.anthropic.com",
  "model": "claude-haiku-5-5",
  "auth": "x-api-key",
  "keyEnv": "ANTHROPIC_API_KEY",
  "clientAuth": true,
  "trusted": true
}
```

This is a target object, not a complete router config. Start with the packaged config so all tiers,
Jev options and trust targets are present. Keep `trusted` true only for providers authorized to receive
your private content. A configured key overrides the client's login for that target.

Use the UI at `http://127.0.0.1:4100`, the JSON route log, or `x-jev-tier`, `x-jev-model` and
`x-jev-reason` response headers to inspect decisions. `#frontier` pins the frontier tier; `/model`
family changes retain their existing tier-pin behavior. Escalation happens at new human turns;
tool loops stay on their selected tier. A model switch starts a separate prompt cache.

## Compatibility and history

The static registry in `src/models.mjs` records capabilities for exact known model IDs. Existing
`omit`, `maxOutputTokens`, `foldSystemMessages` and `omitBetas` target overrides remain available.
Historical Haiku 4.5 adaptations remain for users who explicitly configure that model.

Signed thinking blocks must be replayed unchanged within tool loops. Claude-to-Claude histories are
preserved; Anthropic decides which other models' blocks it can read. Newer blocks can bind the account,
model and earlier conversation, so editing an earlier message or changing credentials may invalidate
history. Keep conversations append-only; start a fresh conversation when changing credential accounts.
See [Sonnet migration](https://platform.claude.com/docs/en/models/sonnet-5-5/migration-guide) and
[Haiku migration](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide).

Unsupported forced tool choices, manual thinking budgets, prefills and sampling settings cannot be
made equivalent by silently dropping them. Known incompatible requests fail with an actionable error.
Unknown models retain existing configurable behavior and upstream validation; their capabilities are
not inferred from a family-like name. Responses, including tool calls, thinking and SSE events, remain
byte-for-byte streams. No live claim is made for every Claude Code client version or feature.

## Token-cost estimates

Official standard Claude API rates in USD per million tokens:

| Model / total prompt | Input | Output | Read | Write, 5m | Write, 1h |
| --- | --- | --- | --- | --- | --- |
| Haiku 5.5, at most 100,000 | $0.10 | $0.50 | $0.01 | $0.125 | $0.20 |
| Haiku 5.5, over 100,000 | $0.50 | $2.50 | $0.05 | $0.625 | $1.00 |
| Sonnet 5.5 | $2 | $10 | $0.10 | $2.50 | $4 |
| Opus 5.5 | $4 | $20 | $0.20 | $5 | $8 |
| Fable 5.1 | $10 | $50 | $0.25 | $12.50 | $20 |

Haiku's threshold counts uncached input plus cache reads and writes. Above the threshold, all input,
output and cache tokens in that request use the higher rates. Exactly 100,000 stays on the lower rates.
Sonnet and Opus 5.5 have no long-context premium at standard rates. Sources:
[pricing](https://platform.claude.com/docs/en/about-claude/pricing) and
[prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).

`prices.<model>.cacheWrite1h` prices one-hour writes. Optional
`longContext: {"aboveInputTokens": 100000, "in": 0.5, "out": 2.5, "cacheRead": 0.05,
"cacheWrite": 0.625, "cacheWrite1h": 1}` declares the threshold and full replacement rates.
Missing optional cache rates retain the existing input-rate fallback, except when a duration is known
but cannot be priced. Invalid, negative or non-finite prices fail validation.

Run `jev-router report` for the default router log, or `jev-router report /path/to/router.log`.
Costs are estimates of standard token usage, not subscription charges or invoices. They exclude
provider-specific discounts, server-tool fees and any billing category not represented by the configured
rates. The baseline reprices the same observed tokens; it is not a measured alternate execution.
Tokenization, output length, cache hits and task completion may differ if another model runs the task.
No measured savings or unchanged coding quality is claimed.

Missing prices, incomplete usage and unknown cache duration can prevent an estimate. Reports preserve
their JSON fields: cost and baseline totals are known subtotals; savings sum only requests with both
estimates. An absent cost is unknown, never a free request. The live view identifies partial comparisons.
Historical logs retain their recorded estimates and cannot recover duration details that were not logged.

## Future model upgrades

Use static reviewed metadata plus optional manual Models API verification. Normal startup remains
offline; discovery never automatically changes tier defaults.

1. Check official model specifications, migration guides, pricing and account availability.
1. With supported API credentials, inspect `GET https://api.anthropic.com/v1/models` and its pagination.
   Check exact IDs, lifecycle, `max_input_tokens`, `max_tokens` and capability fields. Do not copy sample
   response values as factual limits. See the [Models API](https://platform.claude.com/docs/en/api/models/list).
1. Update `src/models.mjs` for known compatibility and `config/*.json` for tier mappings and prices.
   Keep historical entries needed by user configs. Configured target overrides allow experiments without
   treating an unknown model as officially supported.
1. Preserve the Fable config's relationship to the Claude config. Append new packaged config digests in
   `src/files.mjs`; keep earlier digests so unchanged older copies remain recognizable.
1. Add deterministic compatibility, routing and pricing regressions. Run focused tests, lint, typecheck,
   `npm run check` and `npm run test:package`. Perform a bounded live check when credentials are available.
1. Update this document, README, configuration reference and changelog with sources and verification dates.

## Migration and rollback

Install this fork from GitHub; no npm publication is required:

```bash
npm install -g github:simonyost/jev-router#main
jev-router setup --models claude
```

Use `#<commit-sha>` instead of `#main` to pin a reviewed revision. Setup run from this fork's Git checkout
installs that checkout when a lasting package is needed, so a feature branch does not resolve to old main.
For an installed artifact with no recorded source, install hints fall back to this fork's main branch.
Before replacing an upstream global
installation, run its `jev-router uninstall` to stop its service and restore its Claude settings, then
remove the package that owns the command (`npm uninstall -g @ediri/jev-router` or the older
`npm uninstall -g @dirien/jev-router`). Shared service labels and state paths are retained for migration;
run one router installation at a time.

Before upgrading, copy `~/.config/jev-router/config.json` to a backup outside the package. Setup keeps
custom configurations and their model selections; selecting another packaged option replaces only an
unchanged recognized config. To adopt new defaults from an existing same-option config, explicitly run
`jev-router init --models claude --force` after backing it up, then run setup again. Never overwrite
custom model mappings without reviewing them.

To roll back, run `jev-router uninstall`, reinstall the prior pinned revision, restore the saved config,
and run its setup. To return fully to direct Claude Code access, run `jev-router uninstall` and remove
`@simonyost/jev-router` globally. Uninstall keeps config, keys and logs; it restores only settings it owns.
An independently exported `ANTHROPIC_BASE_URL` must also be removed from your shell setup.

Common problems: a command collision means an older package still owns `jev-router`; a 401/403 means
credentials or account access need attention; an unavailable model returns the upstream error without
fallback; a bound-thinking error means history or credentials changed; custom configs stay on old IDs
until explicitly edited. `jev-router doctor` checks local setup but does not prove model entitlement.
