# Contributing

Thanks for your interest in improving Zendesk Link Collector. This guide
covers how the project is structured and the conventions used for changes
so that a pull request is easy to review and ready to merge quickly.

## Project values

- **Zero runtime dependencies.** The extension does not pull in any
  npm packages at runtime. The repository intentionally does not commit
  a `package.json`, `package-lock.json`, or `node_modules`. This keeps
  the security surface small, the audit story simple, and the codebase
  easy to read end-to-end.
- **Cross-browser parity.** The extension targets current Chrome and
  Firefox (Manifest V3). Behavior and visual output should match in both.
- **Plain web platform first.** Use standard DOM, CSS, and JavaScript
  primitives wherever they're sufficient. Reach for a build step or
  abstraction only when there's a clear, concrete reason.

## Pull requests

The single most important thing you can do is keep PRs **small, focused,
and easy to review**. The target is a PR a reviewer can read end-to-end
in roughly ten minutes.

### Size and scope

- Prefer **more, smaller PRs** over one large one. A well-scoped PR
  changes one thing.
- Be **ruthless about scope**. If a change you're about to make doesn't
  belong in the headline of the PR, move it to its own PR.
- "Drive-by" cleanups, refactors, or unrelated bug fixes should land in
  their own PRs, even when they're tiny.

### Commits

- Split larger PRs into **logical, atomic commits** that can be reviewed
  one at a time.
- Each commit should leave the codebase in a working state.
- Write commit messages that explain *why*, not just *what*. The diff
  shows the *what*.

### PR description

Every PR description should include a **Notes for reviewers** section
that gives the reviewer the context they need to read the diff
efficiently. Useful things to put there:

- A brief summary of what the PR does and why.
- A walkthrough of the commits in review order, if there's more than one.
- Anything subtle the reviewer should look for.
- Test steps the reviewer can run locally.
- Cross-references to related PRs or issues, including dependencies
  ("depends on #N", "related to #N").

If a PR is genuinely a single mechanical change, the description can be
short — but always include the test steps.

## Local development

Prerequisites: a recent Node.js (the project tests with Node 20) and
[`web-ext`](https://github.com/mozilla/web-ext) on your `PATH`:

```sh
npm install -g web-ext
```

The repository uses a small `makefile` for build and lint targets:

```sh
make dev      # Build both browsers' zips with the dev-only gecko ID
make build    # Build both browsers' zips with the release gecko ID
make lint     # Run web-ext lint against both builds (manifest / MV3 checks)
```

Both `dev` and `build` produce zip artifacts under
`build/firefox/artifacts/` and `build/chrome/artifacts/`. To actually run
the extension, load the resulting build directory (or zip) into the
browser:

- **Firefox:** `web-ext run --source-dir=build/firefox` (uses a temporary
  profile so it doesn't share data with your installed release version).
- **Chrome:** load `build/chrome` as an unpacked extension at
  `chrome://extensions`.

The `dev` target swaps the Firefox `gecko.id` to a development-only ID so
loading the extension as a temporary add-on doesn't disturb the data of
an already-installed release version. See `makefile` for details.

## Linting

ESLint runs automatically on every pull request via GitHub Actions. The
workflow installs ESLint inline, so you do not need to install or commit
any npm artifacts to contribute.

If you want to run the JavaScript lint locally before pushing:

```sh
npx --yes -p eslint@^10 -p @eslint/js@^10 -p globals@^17 eslint src/
```

The `node_modules/` directory created by that command is gitignored.

`make lint` runs `web-ext lint` against the per-browser builds. This
catches manifest-schema, MV3, and Firefox-specific warnings that ESLint
can't see, and is a good sanity check before opening a PR that touches
manifests or extension APIs.

## Cross-browser testing

A change isn't complete until it's been verified in **both** Chrome and
Firefox. Default styles, form-control rendering, popup window behavior,
and extension API surface all differ subtly between the two. Test:

- The popup itself (open it on a Zendesk ticket).
- The options page.
- Behavior on a tab that was already open before the extension reloaded
  (this exercises the content-script injection path).

## File layout

```
src/
  background/        Service worker / background script
  content-scripts/   Code injected into Zendesk pages
  popup/             Extension popup UI (HTML, CSS, JS)
  options/           Options page UI
  lib/               Vendored / shimmed cross-browser helpers
  manifest.json              Default (Chrome / MV3) manifest
  manifest-chrome.json       Chrome-specific manifest
  manifest-firefox.json      Firefox-specific manifest
```

## Reporting issues

Bug reports and feature requests are welcome on the
[issue tracker](https://github.com/BagToad/Zendesk-Link-Collector/issues).
A reproduction case (URL pattern, browser, extension version) makes
triage much faster.
