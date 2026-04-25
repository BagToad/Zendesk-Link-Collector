// Cross-browser shim: alias `chrome.*` to `browser.*` in Chromium browsers.
//
// Chrome 88+ supports promises on the `chrome.*` namespace natively in MV3,
// so we no longer need the full webextension-polyfill (~10KB). Firefox already
// exposes `browser.*` as a promise-based API.
//
// This file must be loaded BEFORE any script that references `browser.*`.
if (typeof globalThis.browser === "undefined") {
  globalThis.browser = globalThis.chrome;
}
