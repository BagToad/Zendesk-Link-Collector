# AGENTS.md

Guidance for AI coding agents (and other automated tools) working on this
repository. **Read [CONTRIBUTING.md](CONTRIBUTING.md) first** — the rules
in this file are additive to it, not replacements.

## Non-negotiables

- **No new committed dependencies.** Do not commit `package.json`,
  `package-lock.json`, `node_modules`, or any other dependency manifest.
  The project is intentionally zero-dependency at rest. (The lint
  one-liner below uses `npx`, which creates a gitignored `node_modules`
  — that is fine; nothing is committed.) If a task seems to require a
  vendored library, surface that as a question rather than committing
  it.
- **Never run `make build` for local testing.** `make build` produces
  artifacts with the **release** Firefox `gecko.id`, which is the same
  ID as the AMO-published extension. Loading that build as a temporary
  add-on shares `browser.storage.sync` with the user's installed
  release version and can wipe their real data. Use `make dev` (which
  swaps to a development-only `gecko.id`) for any local install/load.
  `make build` is for producing release artifacts only.
- **No autoformatter sweeps.** Do not reformat files you aren't actively
  changing. A noisy diff is hard to review and obscures the real change.
- **No silent scope expansion.** If you notice unrelated bugs, dead code,
  or improvements while working on a task, list them as follow-up
  candidates in your response — don't fold them into the current PR.

## Build, lint, and test

Concrete commands. Prerequisites: a recent Node.js and
[`web-ext`](https://github.com/mozilla/web-ext) on `PATH`
(`npm install -g web-ext`).

```sh
# Build for local testing — uses dev gecko.id (safe to load alongside release)
make dev

# Build release artifacts — DO NOT load this into a browser you actually use
make build

# Manifest / MV3 / Firefox-specific lint via web-ext
make lint

# JavaScript lint (matches the CI workflow)
npx --yes -p eslint@^10 -p @eslint/js@^10 -p globals@^17 eslint src/
```

There is no automated test suite in this repository; verification is
manual and cross-browser (see CONTRIBUTING.md for the checklist).

## Pull-request shape

The repository's PR conventions (see CONTRIBUTING.md) are strict and
agent output is expected to follow them:

- Branch off the latest main of upstream — typically `upstream/main`
  when working from a fork with two remotes, `origin/main` from a
  direct clone of the upstream repo. Each PR stands on its own — do
  not git-stack PRs unless the user explicitly asks.
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
- The `browser.*` namespace is native in Firefox. In Chrome, content
  scripts and the Firefox-only `background.scripts` entry both load
  `src/lib/browser-shim.js` to alias `chrome` → `browser`. Chrome's MV3
  **service worker** (see `manifest-chrome.json`) does *not* auto-load
  the shim — use `chrome.*` directly there, or `importScripts(
  '../lib/browser-shim.js')` at the top of the worker.
- Chrome's MV3 background context is a service worker: no DOM, no
  `XMLHttpRequest`, terminates after ~30 s of idle. Don't keep
  module-level state across messages — persist to `browser.storage`.
  Firefox MV3 still permits a `background.scripts` array (see
  `manifest-firefox.json`), so the two manifests differ here on
  purpose.

## When unsure, ask

If a task has ambiguous scope, conflicting goals, or would require
violating any rule above, ask a clarifying question before writing
code. If you're running non-interactively (e.g. as a CI bot with no
human in the loop), stop and emit the question in the PR description
or commit message rather than guessing — a short clarifying exchange
is much cheaper than a PR that has to be rewritten.
