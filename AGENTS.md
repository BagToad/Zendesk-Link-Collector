# AGENTS.md

Guidance for AI coding agents (and other automated tools) working on this
repository. **Read [CONTRIBUTING.md](CONTRIBUTING.md) first** — the rules
in this file are additive to it, not replacements.

## Non-negotiables

- **No new dependencies.** Do not add `package.json`, `package-lock.json`,
  `node_modules`, or any other dependency manifest unless explicitly
  asked. The project is intentionally zero-dependency at rest. If a
  task seems to require a library, surface that as a question rather
  than committing it.
- **No autoformatter sweeps.** Do not reformat files you aren't actively
  changing. A noisy diff is hard to review and obscures the real change.
- **No silent scope expansion.** If you notice unrelated bugs, dead code,
  or improvements while working on a task, list them as follow-up
  candidates in your response — don't fold them into the current PR.

## Pull-request shape

The repository's PR conventions (see CONTRIBUTING.md) are strict and
agent output is expected to follow them:

- Branch off `upstream/main`. Each PR stands on its own — do not
  git-stack PRs unless the user explicitly asks.
- One headline change per PR. If a task naturally produces two
  unrelated changes, open two PRs.
- Split larger changes into logical, atomic commits that build on
  each other.
- Every PR description includes a **Notes for reviewers** section that
  walks through the commits in review order and gives test steps.
- Cross-reference related PRs ("related to #N", "depends on #N").

## Cross-browser awareness

This is a Manifest V3 browser extension that must work identically in
Chrome and Firefox. Before writing or modifying CSS or extension-API
code, check that the property or API behaves the same in both browsers.
See CONTRIBUTING.md for the testing checklist.

Common surprises:

- Default form-control styling differs between Chrome and Firefox; use
  `appearance: none` and explicit styles.
- Chrome's popup clips to a sharp rectangle (no rounded corners on the
  outer frame); Firefox's does not.
- `browser.*` is native in Firefox but provided via shim
  (`src/lib/browser-shim.js`) in Chrome.

## When unsure, ask

If a task has ambiguous scope, conflicting goals, or would require
violating any rule above, ask a clarifying question before writing
code. A short clarifying exchange is much cheaper than a PR that has
to be rewritten.
