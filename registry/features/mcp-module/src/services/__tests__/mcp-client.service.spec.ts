import { describe, expect, it, vi } from 'vitest';
import { McpToolConfig, McpToolConfigSchema } from '../../config/mcp-tool-config.schema.js';
import {
  McpAuthError,
  McpProtocolError,
  McpTimeoutError,
  McpTransportError,
  McpUrlSecurityError,
} from '../../errors.js';
import type { EnvReader } from '../env-reader.js';
import { McpClientService } from '../mcp-client.service.js';
import type { McpMetricsPort } from '../metrics-port.js';

function makeService(envMap: Record<string, string | undefined>): McpClientService {
  const env: EnvReader = {
    get: (k) => {
      const v = envMap[k];
      return v === undefined || v === '' ? undefined : v;
    },
  };
  const metrics: McpMetricsPort = { recordConnect: vi.fn(), recordCall: vi.fn() };
  return new McpClientService(env, metrics);
}

function cfg(partial: Partial<McpToolConfig> & { allowedHosts: string[] }): McpToolConfig {
  return McpToolConfigSchema.parse(partial);
}

const url = new URL('https://mcp.linear.app/sse');

describe('McpClientService.mergeHeaders', () => {
  it('returns empty headers when no config keys provided', () => {
    const svc = makeService({});
    expect(svc.mergeHeaders(cfg({ allowedHosts: ['mcp.linear.app'] }), url)).toEqual({});
  });

  it('starts from defaultHeaders (keys lowercased)', () => {
    const svc = makeService({});
    expect(
      svc.mergeHeaders(cfg({ allowedHosts: ['mcp.linear.app'], defaultHeaders: { 'X-Trace': 'on' } }), url),
    ).toEqual({ 'x-trace': 'on' });
  });

  it('applies global headerEnv when env var is set', () => {
    const svc = makeService({ LINEAR_TOKEN: 'Bearer abc' });
    expect(
      svc.mergeHeaders(
        cfg({
          allowedHosts: ['mcp.linear.app'],
          headerEnv: { Authorization: 'LINEAR_TOKEN' },
        }),
        url,
      ),
    ).toEqual({ authorization: 'Bearer abc' });
  });

  it('skips headerEnv entries whose env var is unset or empty', () => {
    const svc = makeService({ LINEAR_TOKEN: '' });
    expect(
      svc.mergeHeaders(
        cfg({
          allowedHosts: ['mcp.linear.app'],
          headerEnv: { Authorization: 'LINEAR_TOKEN', 'X-Other': 'MISSING' },
        }),
        url,
      ),
    ).toEqual({});
  });

  it('applies host-specific headerEnv only for matching host', () => {
    const svc = makeService({ TOK: 'Bearer xyz' });
    const c = cfg({
      allowedHosts: ['mcp.linear.app', 'mcp.github.com'],
      hostHeaderEnv: { 'mcp.linear.app': { Authorization: 'TOK' } },
    });

    expect(svc.mergeHeaders(c, new URL('https://mcp.linear.app/sse'))).toEqual({
      authorization: 'Bearer xyz',
    });
    expect(svc.mergeHeaders(c, new URL('https://mcp.github.com/sse'))).toEqual({});
  });

  it('applies hostHeaderEnv["*"] to all hosts', () => {
    const svc = makeService({ TRACE: 'on' });
    expect(
      svc.mergeHeaders(
        cfg({
          allowedHosts: ['mcp.linear.app'],
          hostHeaderEnv: { '*': { 'X-Trace': 'TRACE' } },
        }),
        url,
      ),
    ).toEqual({ 'x-trace': 'on' });
  });

  it('host-specific entry overrides wildcard for the same header name', () => {
    const svc = makeService({ TRACE_DEFAULT: 'default', TRACE_LINEAR: 'linear' });
    expect(
      svc.mergeHeaders(
        cfg({
          allowedHosts: ['mcp.linear.app'],
          hostHeaderEnv: {
            '*': { 'X-Trace': 'TRACE_DEFAULT' },
            'mcp.linear.app': { 'X-Trace': 'TRACE_LINEAR' },
          },
        }),
        url,
      ),
    ).toEqual({ 'x-trace': 'linear' });
  });

  it('precedence: hostHeaderEnv overrides global headerEnv overrides defaultHeaders', () => {
    const svc = makeService({ G: 'global', H: 'host' });
    expect(
      svc.mergeHeaders(
        cfg({
          allowedHosts: ['mcp.linear.app'],
          defaultHeaders: { 'X-Source': 'default' },
          headerEnv: { 'X-Source': 'G' },
          hostHeaderEnv: { 'mcp.linear.app': { 'X-Source': 'H' } },
        }),
        url,
      ),
    ).toEqual({ 'x-source': 'host' });
  });

  it('precedence is case-insensitive across layers', () => {
    const svc = makeService({ TOK: 'Bearer x' });
    expect(
      svc.mergeHeaders(
        cfg({
          allowedHosts: ['mcp.linear.app'],
          defaultHeaders: { 'X-Trace': 'default' },
          hostHeaderEnv: { 'mcp.linear.app': { 'x-trace': 'TOK' } },
        }),
        url,
      ),
    ).toEqual({ 'x-trace': 'Bearer x' });
  });

  it('uses ProcessEnvReader by default when no reader injected', () => {
    process.env.__MCP_TEST_TOKEN__ = 'real';
    try {
      const svc = new McpClientService();
      expect(
        svc.mergeHeaders(
          cfg({
            allowedHosts: ['mcp.linear.app'],
            headerEnv: { Authorization: '__MCP_TEST_TOKEN__' },
          }),
          url,
        ),
      ).toEqual({ authorization: 'real' });
    } finally {
      delete process.env.__MCP_TEST_TOKEN__;
    }
  });
});

describe('McpClientService.mapSdkError', () => {
  type ErrorMapper = (e: unknown) => Error;
  const mapper = (): ErrorMapper => {
    const svc = makeService({});
    return (svc as unknown as { mapSdkError: ErrorMapper }).mapSdkError.bind(svc);
  };

  it('passes through existing McpError subclasses unchanged', () => {
    const m = mapper();
    const orig = new McpAuthError('already classified');
    expect(m(orig)).toBe(orig);
  });

  it('maps AbortError / TimeoutError name to McpTimeoutError', () => {
    const m = mapper();
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const timeout = Object.assign(new Error('expired'), { name: 'TimeoutError' });
    expect(m(abort)).toBeInstanceOf(McpTimeoutError);
    expect(m(timeout)).toBeInstanceOf(McpTimeoutError);
  });

  it('maps 401/403 HTTP status to McpAuthError', () => {
    const m = mapper();
    expect(m({ status: 401, message: 'no' })).toBeInstanceOf(McpAuthError);
    expect(m({ statusCode: 403, message: 'no' })).toBeInstanceOf(McpAuthError);
    expect(m({ response: { status: 401 }, message: 'no' })).toBeInstanceOf(McpAuthError);
  });

  it('maps JSON-RPC parse / invalid-request codes to McpProtocolError', () => {
    const m = mapper();
    expect(m({ code: -32700, message: 'parse' })).toBeInstanceOf(McpProtocolError);
    expect(m({ code: -32600, message: 'invalid' })).toBeInstanceOf(McpProtocolError);
  });

  it('does NOT misclassify based on message substrings', () => {
    // Old string-matching classifier would have flagged these as auth/timeout/protocol;
    // structured classifier should fall through to transport.
    const m = mapper();
    expect(m(new Error('tool returned 401 in payload'))).toBeInstanceOf(McpTransportError);
    expect(m(new Error('the word timeout is in this body'))).toBeInstanceOf(McpTransportError);
    expect(m(new Error('json blob says hello'))).toBeInstanceOf(McpTransportError);
  });

  it('defaults unknown errors to McpTransportError preserving the message', () => {
    const m = mapper();
    const mapped = m(new Error('connection reset by peer'));
    expect(mapped).toBeInstanceOf(McpTransportError);
    expect(mapped.message).toContain('connection reset by peer');
  });

  it('non-Error inputs still map to McpTransportError', () => {
    const m = mapper();
    expect(m('boom')).toBeInstanceOf(McpTransportError);
    expect(m(undefined)).toBeInstanceOf(McpTransportError);
  });

  it('McpUrlSecurityError passes through (used by connect path)', () => {
    const m = mapper();
    const orig = new McpUrlSecurityError('blocked');
    expect(m(orig)).toBe(orig);
  });
});
