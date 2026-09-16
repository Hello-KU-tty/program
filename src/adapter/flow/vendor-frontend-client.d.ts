/**
 * Type shim for the vendored `@vibe-helper/frontend-client` bundle.
 *
 * The program compiles with `module: CommonJS` + `moduleResolution: Node`
 * (node10 classic), which resolves a bare relative import to the sibling
 * declaration file and does NOT consult the package `exports` map. The vendored
 * bundle ships its declarations under `types/esm/*.d.ts`, so a direct relative
 * import of the runtime `.cjs` files cannot find types on its own.
 *
 * A directory import of the package root (`../../../vendor/frontend-client`)
 * DOES resolve, because TS reads that folder's `package.json` `types` field
 * (`types/esm/index.d.ts`) — so `index.cjs` exports are typed with no shim.
 *
 * The Node-only `./node` subpath has no folder-level `package.json`, so we map
 * it here with a wildcard ambient module that matches any relative specifier
 * ending in `frontend-client/node.cjs`. `LocalCoreClient` and `LocalConnection`
 * are pulled from the (resolvable) root declaration file so the shim stays in
 * sync with the vendored types.
 *
 * `skipLibCheck` keeps the vendored declarations from being deep-checked. This
 * is host-only type glue and adds no runtime behavior.
 */

declare module "*frontend-client/node.cjs" {
  import type {
    LocalConnection,
    LocalCoreClient,
  } from "../../../vendor/frontend-client";

  export function readLocalConnection(file: string): Promise<LocalConnection>;
  export function connectLocalCore(file: string): Promise<LocalCoreClient>;
}
