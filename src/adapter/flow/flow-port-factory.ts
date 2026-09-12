/**
 * createFlowPorts — the single construction/swap point for the concrete
 * Discovery_Port / Spec_Port implementations, mirroring `createAgentAdapter`.
 *
 * See design.md "Port factory: single swap point (Req 1.4, 1.5)".
 * Requirements: 1.4, 1.5.
 */

import type { FlowPorts } from "./discovery-port";
import { MockDiscoveryPort } from "./mock-flow-port";

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
  return { discovery: port, spec: port };
}
