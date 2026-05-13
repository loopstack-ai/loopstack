import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { McpToolConfig } from '../config/mcp-tool-config.schema';
import { McpAuthError, McpProtocolError, McpTimeoutError, McpTransportError, McpUrlSecurityError } from '../errors';
import type { McpTransportKind } from '../types';
import { assertMcpUrlSafe } from '../utils/url-security';
import { EnvReader, MCP_ENV_READER, ProcessEnvReader } from './env-reader';
import type { McpClientLike, McpTransportLike } from './mcp-sdk.types';
import {
  MCP_METRICS,
  McpCallOutcome,
  McpCallSample,
  McpConnectSample,
  McpMetricsPort,
  NoopMcpMetrics,
} from './metrics-port';

const CLIENT_INFO = { name: 'loopstack-mcp-module', version: '0.1.0' };
const DEFAULT_TIMEOUT_MS = 60_000;
const OUTER_TIMEOUT_BUFFER_MS = 15_000;

export type { McpTransportKind };

export interface McpClientCallOptions {
  timeoutMs?: number;
  /** Test-only: bypasses the public-IP DNS check. */
  skipDnsResolution?: boolean;
  transport?: McpTransportKind;
}

@Injectable()
export class McpClientService {
  private readonly logger = new Logger(McpClientService.name);

  constructor(
    @Optional() @Inject(MCP_ENV_READER) private readonly env: EnvReader = new ProcessEnvReader(),
    @Optional() @Inject(MCP_METRICS) private readonly metrics: McpMetricsPort = new NoopMcpMetrics(),
  ) {}

  async listTools(
    rawUrl: string,
    config: McpToolConfig,
    options: McpClientCallOptions = {},
  ): Promise<{ tools: unknown }> {
    const startedAt = Date.now();
    const { client, transport, transportKind, host } = await this.connect(rawUrl, config, options);
    try {
      const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const result = await client.listTools(undefined, { timeout: timeoutMs, maxTotalTimeout: timeoutMs });
      this.recordCall({
        host,
        transport: transportKind,
        operation: 'listTools',
        outcome: 'success',
        latencyMs: Date.now() - startedAt,
      });
      return { tools: result.tools };
    } catch (e) {
      const mapped = this.mapSdkError(e);
      this.recordCall({
        host,
        transport: transportKind,
        operation: 'listTools',
        outcome: outcomeFor(mapped),
        latencyMs: Date.now() - startedAt,
      });
      throw mapped;
    } finally {
      await this.dispose(transport, transportKind);
    }
  }

  async callTool(
    rawUrl: string,
    config: McpToolConfig,
    toolName: string,
    toolArgs: Record<string, unknown>,
    options: McpClientCallOptions = {},
  ): Promise<Record<string, unknown>> {
    const startedAt = Date.now();
    const { client, transport, transportKind, host } = await this.connect(rawUrl, config, options);
    try {
      const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const result = await client.callTool({ name: toolName, arguments: toolArgs }, undefined, {
        timeout: timeoutMs,
        maxTotalTimeout: timeoutMs,
      });

      this.recordCall({
        host,
        transport: transportKind,
        operation: 'callTool',
        toolName,
        outcome: 'success',
        latencyMs: Date.now() - startedAt,
      });

      if ('toolResult' in result && result.toolResult !== undefined) {
        return {
          kind: 'legacyToolResult',
          toolResult: result.toolResult as unknown,
          meta: result._meta,
        };
      }

      return {
        kind: 'callToolResult',
        content: result.content,
        structuredContent: result.structuredContent,
        isError: result.isError,
        meta: result._meta,
      };
    } catch (e) {
      const mapped = this.mapSdkError(e);
      this.recordCall({
        host,
        transport: transportKind,
        operation: 'callTool',
        toolName,
        outcome: outcomeFor(mapped),
        latencyMs: Date.now() - startedAt,
      });
      throw mapped;
    } finally {
      await this.dispose(transport, transportKind);
    }
  }

  /**
   * Header precedence, later wins:
   *   1. defaultHeaders
   *   2. headerEnv (global)
   *   3. hostHeaderEnv['*']
   *   4. hostHeaderEnv[hostname]
   */
  mergeHeaders(config: McpToolConfig, url: URL): Record<string, string> {
    const out: Record<string, string> = { ...(config.defaultHeaders ?? {}) };

    if (config.headerEnv) {
      this.applyEnvMap(out, config.headerEnv);
    }

    if (config.hostHeaderEnv) {
      const wildcard = config.hostHeaderEnv['*'];
      if (wildcard) this.applyEnvMap(out, wildcard);

      const host = url.hostname;
      const hostMap = config.hostHeaderEnv[host];
      if (hostMap && hostMap !== wildcard) this.applyEnvMap(out, hostMap);
    }

    return out;
  }

  private applyEnvMap(into: Record<string, string>, map: Record<string, string>): void {
    for (const [header, envKey] of Object.entries(map)) {
      const v = this.env.get(envKey);
      if (v !== undefined) into[header] = v;
    }
  }

  private async connect(
    rawUrl: string,
    config: McpToolConfig,
    options: McpClientCallOptions,
  ): Promise<{
    client: McpClientLike;
    transport: McpTransportLike;
    transportKind: McpTransportKind;
    host: string;
  }> {
    const startedAt = Date.now();

    let url: URL;
    try {
      url = await assertMcpUrlSafe(rawUrl, config.allowedHosts, config.allowInsecureHttp ?? false, {
        skipDnsResolution: options.skipDnsResolution,
        allowPrivateHosts: config.allowPrivateHosts ?? false,
      });
    } catch (e) {
      const transportKind = options.transport ?? 'streamableHttp';
      const host = safeHost(rawUrl);
      this.recordConnect({
        host,
        transport: transportKind,
        outcome: 'security',
        latencyMs: Date.now() - startedAt,
      });
      throw e instanceof McpUrlSecurityError ? e : new McpUrlSecurityError(asMessage(e));
    }

    const transportKind = options.transport ?? 'streamableHttp';
    const headers = this.mergeHeaders(config, url);
    const headerNames = Object.keys(headers);
    this.logger.log(`mcp.connect host=${url.hostname} transport=${transportKind} headers=[${headerNames.join(',')}]`);

    const client = new Client(CLIENT_INFO, {});
    const controller = new AbortController();
    const outerMs = (options.timeoutMs ?? DEFAULT_TIMEOUT_MS * 2) + OUTER_TIMEOUT_BUFFER_MS;
    const abortTimer = setTimeout(() => controller.abort(), outerMs);

    let transport: McpTransportLike | undefined;

    try {
      const requestInit: RequestInit = { headers: new Headers(headers), signal: controller.signal };

      transport =
        transportKind === 'sse'
          ? new SSEClientTransport(url, { requestInit })
          : new StreamableHTTPClientTransport(url, { requestInit });

      await client.connect(transport);

      this.recordConnect({
        host: url.hostname,
        transport: transportKind,
        outcome: 'success',
        latencyMs: Date.now() - startedAt,
      });

      return { client, transport, transportKind, host: url.hostname };
    } catch (e) {
      if (transport) await transport.close().catch(() => undefined);
      const mapped = this.mapSdkError(e);
      this.recordConnect({
        host: url.hostname,
        transport: transportKind,
        outcome: outcomeFor(mapped),
        latencyMs: Date.now() - startedAt,
      });
      throw mapped;
    } finally {
      clearTimeout(abortTimer);
    }
  }

  private async dispose(transport: McpTransportLike, transportKind: McpTransportKind): Promise<void> {
    try {
      if (transportKind === 'streamableHttp' && transport.terminateSession) {
        await transport.terminateSession().catch(() => undefined);
      }
    } finally {
      await transport.close().catch(() => undefined);
    }
  }

  private mapSdkError(e: unknown): Error {
    if (e instanceof McpUrlSecurityError) return e;
    if (e instanceof McpAuthError) return e;
    if (e instanceof McpTimeoutError) return e;
    if (e instanceof McpProtocolError) return e;
    if (e instanceof McpTransportError) return e;

    const msg = asMessage(e);
    const lower = msg.toLowerCase();

    if (
      lower.includes('401') ||
      lower.includes('403') ||
      lower.includes('unauthorized') ||
      lower.includes('forbidden')
    ) {
      return new McpAuthError(`MCP authentication failed: ${msg}`);
    }
    if (lower.includes('aborted') || lower.includes('timed out') || lower.includes('timeout')) {
      return new McpTimeoutError(`MCP request timed out: ${msg}`);
    }
    if (lower.includes('json') || lower.includes('parse') || lower.includes('jsonrpc') || lower.includes('protocol')) {
      return new McpProtocolError(`MCP protocol error: ${msg}`);
    }
    return new McpTransportError(`MCP transport error: ${msg}`);
  }

  private recordConnect(sample: McpConnectSample): void {
    this.logger.log(
      `mcp.connect.done host=${sample.host} transport=${sample.transport} outcome=${sample.outcome} latencyMs=${sample.latencyMs}`,
    );
    try {
      this.metrics.recordConnect(sample);
    } catch {
      // Metrics must never break the request.
    }
  }

  private recordCall(sample: McpCallSample): void {
    const tn = sample.toolName ? ` toolName=${sample.toolName}` : '';
    this.logger.log(
      `mcp.${sample.operation} host=${sample.host} transport=${sample.transport}${tn} outcome=${sample.outcome} latencyMs=${sample.latencyMs}`,
    );
    try {
      this.metrics.recordCall(sample);
    } catch {
      // Metrics must never break the request.
    }
  }
}

function asMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function outcomeFor(e: Error): McpCallOutcome {
  if (e instanceof McpUrlSecurityError) return 'security';
  if (e instanceof McpAuthError) return 'auth';
  if (e instanceof McpTimeoutError) return 'timeout';
  if (e instanceof McpProtocolError) return 'protocol';
  return 'transport';
}

function safeHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname || '<unknown>';
  } catch {
    return '<invalid-url>';
  }
}
