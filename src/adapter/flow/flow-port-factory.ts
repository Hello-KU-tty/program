/**
 * createFlowPorts — the single construction/swap point for the concrete
 * Discovery_Port / Spec_Port implementations, mirroring `createAgentAdapter`.
 *
 * See design.md "Port factory: single swap point (Req 1.4, 1.5)".
 * Requirements: 1.4, 1.5.
 */

import type { FlowPorts } from "./discovery-port";
import { MockDiscoveryPort } from "./mock-flow-port";
import { LocalCoreDiscoveryPort } from "./local-core-port";
import { connectLocalCore } from "../../../vendor/frontend-client/node.cjs";

/**
 * The single construction/swap point for the concrete Discovery/Spec ports.
 * Returns the MockDiscoveryPort by default (Req 1.5). When the crew-backend
 * transport lands, this becomes a one-line change:
 *
 *   const http = createCrewHttpTransport(...); // proxy HMAC, base URL
 *   const port = new CrewBackendPort(http);
 *   return { discovery: port, spec: port };
 *
 * The CrewBackendPort would POST to `/api/application` with an
 * `x-kirocrew-proxy: <timestamp>:<hmacSHA256>` header and a body carrying
 * `clientProtocolVersion` (CREW_UI_PROTOCOL_VERSION). See crew-backend-port.ts
 * for the documented (unimplemented) contract. This factory is the ONLY place
 * that names a concrete implementation, so the controller and webview never
 * change when swapping.
 */
export function createFlowPorts(options: { seed?: number } = {}): FlowPorts {
  const port = new MockDiscoveryPort({ seed: options.seed });
  // The Mock instance also implements the read-only HistoryPort (guide §6), so
  // the same instance backs discovery, spec, AND history.
  return { discovery: port, spec: port, history: port };
}

// ---------------------------------------------------------------------------
// Fail-closed native gating (guide \u00a71 support boundary, \u00a710 first-PR order)
// ---------------------------------------------------------------------------

/**
 * The verdict of whether the REAL native/live flow (backed by the vendored
 * `@vibe-helper/frontend-client` + a local Core backend) may run on this build.
 *
 * Per the FRONTEND_IDE_IMPLEMENTATION_GUIDE support table, native/live is:
 *   - EXPERIMENTAL GO only on macOS/arm64 (`macOS exact pin \u00b7 experimental`),
 *   - NO-GO / fail-closed on Windows, other Kiro pins, and every other OS.
 *
 * The UI reads this to gate/label native actions; the factory reads it to
 * decide whether to even attempt a live connection.
 */
export interface NativeFlowSupport {
  /** True only on the experimental macOS/arm64 pin. */
  supported: boolean;
  /** A machine-readable reason when not supported (surfaced, never silent). */
  reason?: string;
  /** True when support is experimental (the macOS/arm64 case). */
  experimental: boolean;
}

/**
 * Determine whether the native/live flow is supported on the current platform.
 *
 * Fail-closed: anything that is not macOS/arm64 returns `supported: false` with
 * an explicit `reason`. Windows returns a Windows-specific reason so the UI can
 * show a fail-closed message. macOS/arm64 returns `supported: true,
 * experimental: true` so the UI shows the `macOS exact pin \u00b7 experimental`
 * label. This function is pure and side-effect free.
 */
export function isNativeFlowSupported(): NativeFlowSupport {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "win32") {
    return {
      supported: false,
      experimental: false,
      reason: "UNSUPPORTED_OS_WINDOWS_FAIL_CLOSED",
    };
  }
  if (platform === "darwin" && arch === "arm64") {
    // EXPERIMENTAL GO — the only pinned, verified native path.
    return { supported: true, experimental: true };
  }
  return {
    supported: false,
    experimental: false,
    reason: `UNSUPPORTED_PLATFORM_FAIL_CLOSED_${platform.toUpperCase()}_${arch.toUpperCase()}`,
  };
}

/** The result of the async factory: which port pair was chosen and why. */
export interface CreateFlowPortsResult {
  /** The Discovery/Spec port pair the controller consumes. */
  ports: FlowPorts;
  /** `"live"` when backed by the real SDK; `"mock"` otherwise. */
  mode: "live" | "mock";
  /**
   * When `mode === "mock"` on a build that could have been live, an explicit
   * machine-readable reason for the fallback (never silent). Absent only when
   * live was selected.
   */
  reason?: string;
}

/**
 * Async construction/swap point that may return the REAL SDK-backed port.
 *
 * This is the "(a)" swap: when the platform is supported (macOS/arm64,
 * experimental) AND a `connectionFile` is provided AND the connection is
 * healthy, it returns a {@link LocalCoreDiscoveryPort} wrapping a live
 * `LocalCoreClient`. In EVERY other case it fails closed to the
 * {@link MockDiscoveryPort} with an explicit `reason`:
 *   - unsupported OS (e.g. Windows)      -> `reason` from {@link isNativeFlowSupported}
 *   - no `connectionFile` provided       -> `NO_CONNECTION_FILE`
 *   - connect/health failure             -> `LIVE_CONNECT_FAILED:<code>`
 *
 * SECURITY (guide \u00a79): the `connectionFile` path and the resulting
 * `LocalConnection`/token are read and held HOST-SIDE only, inside the
 * `LocalCoreClient`. This factory never returns, logs, or serializes the
 * connection or token; it returns only the port pair + a mode/reason string.
 *
 * NON-THROWING: any connection error is caught and converted to a mock result
 * with a reason. The factory never throws out to its caller.
 *
 * The synchronous {@link createFlowPorts} (Mock) is left intact for tests and
 * back-compat; all current call sites and tests keep using it unchanged.
 */
export async function createFlowPortsAsync(
  options: { connectionFile?: string; seed?: number } = {},
): Promise<CreateFlowPortsResult> {
  const support = isNativeFlowSupported();

  // Fail-closed on unsupported OS/pin — surface the reason, do not attempt.
  if (!support.supported) {
    return mock(options.seed, support.reason ?? "UNSUPPORTED_FAIL_CLOSED");
  }

  // Supported but no connection descriptor: nothing to connect to.
  if (!options.connectionFile) {
    return mock(options.seed, "NO_CONNECTION_FILE");
  }

  try {
    // Host-only: connectLocalCore reads the private descriptor + runs health().
    const client = await connectLocalCore(options.connectionFile);
    const port = new LocalCoreDiscoveryPort(client);
    // LocalCoreDiscoveryPort implements DiscoveryPort + SpecPort + HistoryPort,
    // so the same instance backs all three roles (guide §6/§10-2).
    return { ports: { discovery: port, spec: port, history: port }, mode: "live" };
  } catch (e) {
    // Never throw out of the factory; fall back to the mock with a reason.
    const code = errorCodeOf(e);
    return mock(options.seed, `LIVE_CONNECT_FAILED:${code}`);
  }
}

/** Build a mock result carrying an explicit fallback reason. */
function mock(seed: number | undefined, reason: string): CreateFlowPortsResult {
  const port = new MockDiscoveryPort({ seed });
  // The Mock also backs the read-only HistoryPort (guide §6).
  return { ports: { discovery: port, spec: port, history: port }, mode: "mock", reason };
}

/** Extract a short, non-sensitive error code from a thrown connection error. */
function errorCodeOf(e: unknown): string {
  if (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof (e as { code: unknown }).code === "string"
  ) {
    return (e as { code: string }).code;
  }
  if (e instanceof Error) return e.name || "ERROR";
  return "UNKNOWN";
}
