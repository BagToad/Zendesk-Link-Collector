// Cross-browser shim: alias `chrome.*` to `browser.*` in Chromium browsers.
//
// Chrome 88+ supports promises on the `chrome.*` namespace natively in MV3,
// so we no longer need the full webextension-polyfill (~10KB). Firefox already
// exposes `browser.*` as a promise-based API.
//
// This file must be loaded BEFORE any script that references `browser.*`.
//
// Caveat — onMessage listener semantics differ from the polyfill:
//   - The polyfill wrapped `onMessage.addListener` so returning a Promise
//     from the listener forwarded its resolved value to `sendResponse`.
//   - This shim is just an alias, so Chrome's native rule applies:
//     * Return `true` to signal an async `sendResponse` (port stays open).
//     * Return `undefined` (or fall through) for synchronous / fire-and-
//       forget branches (port closes immediately).
//   - Returning a Promise here is silently ignored on Chrome; sendResponse
//     never fires. Don't write listeners that rely on that pattern.
if (typeof globalThis.browser === "undefined") {
  globalThis.browser = globalThis.chrome;
}
