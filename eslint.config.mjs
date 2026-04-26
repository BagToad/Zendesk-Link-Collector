import globals from "globals";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        // `browser` global — extension API namespace
        browser: "readonly",
        // Chrome APIs used directly in some files
        chrome: "readonly",
        // Chrome service worker global for loading scripts
        importScripts: "readonly",
      },
    },
    rules: {
      // Keep it basic — flag real problems, not style preferences
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-redeclare": "error",
      "no-constant-condition": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  {
    // Ignore build output and vendored libraries
    ignores: ["build/**", "src/lib/**", "node_modules/**"],
  },
];
