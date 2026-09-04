// Build script for the Builder & Helper Agent Panel extension.
//
// Produces two self-contained bundles into `dist/`:
//
//   1. Extension host bundle  — src/extension.ts       -> dist/extension.js
//      Node/CJS, `vscode` left external (provided by the host runtime). This is
//      what package.json's `main: ./dist/extension.js` resolves to.
//
//   2. Webview UI bundle      — src/webview/main.ts     -> dist/webview/main.js
//      Browser/IIFE so the webview can load a single <script> with no `require`.
//      main.ts auto-bootstraps against `#app` on load.
//
// Usage:
//   node esbuild.mjs            one-off production build
//   node esbuild.mjs --watch    rebuild on change (dev loop)
//
// Dependency-free beyond esbuild.

import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const extensionConfig = {
  entryPoints: ["src/extension.ts"],
  outfile: "dist/extension.js",
  platform: "node",
  format: "cjs",
  target: "node18",
  external: ["vscode"],
  bundle: true,
  sourcemap: true,
  logLevel: "info",
};

/** @type {import("esbuild").BuildOptions} */
const webviewConfig = {
  entryPoints: ["src/webview/main.ts"],
  outfile: "dist/webview/main.js",
  platform: "browser",
  format: "iife",
  target: ["es2020"],
  bundle: true,
  sourcemap: true,
  logLevel: "info",
};

async function main() {
  if (watch) {
    const [extCtx, webCtx] = await Promise.all([
      esbuild.context(extensionConfig),
      esbuild.context(webviewConfig),
    ]);
    await Promise.all([extCtx.watch(), webCtx.watch()]);
    console.log("[esbuild] watching extension + webview bundles for changes...");
    // Keep the process alive while watching.
    return;
  }

  await Promise.all([
    esbuild.build(extensionConfig),
    esbuild.build(webviewConfig),
  ]);
  console.log(
    "[esbuild] build complete: dist/extension.js (cjs) + dist/webview/main.js (iife)",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
