import type { McpTransportKind } from '../types.js';

export type McpCallOutcome = 'success' | 'auth' | 'timeout' | 'protocol' | 'transport' | 'security';

export interface McpConnectSample {
  host: string;
  transport: McpTransportKind;
  outcome: McpCallOutcome;
  latencyMs: number;
}

export interface McpCallSample {
  host: string;
  transport: McpTransportKind;
  operation: 'listTools' | 'callTool';
  toolName?: string;
  outcome: McpCallOutcome;
  latencyMs: number;
}

/** Default registration is a no-op; override the `MCP_METRICS` token to forward to OpenTelemetry etc. */
export interface McpMetricsPort {
  recordConnect(sample: McpConnectSample): void;
  recordCall(sample: McpCallSample): void;
}

export class NoopMcpMetrics implements McpMetricsPort {
  recordConnect(): void {}
  recordCall(): void {}
}

export const MCP_METRICS = Symbol('MCP_METRICS');
