import { McpToolConfig, McpToolConfigSchema } from '../../config/mcp-tool-config.schema';
import type { EnvReader } from '../env-reader';
import { McpClientService } from '../mcp-client.service';
import type { McpMetricsPort } from '../metrics-port';

function makeService(envMap: Record<string, string | undefined>): McpClientService {
  const env: EnvReader = {
    get: (k) => {
      const v = envMap[k];
      return v === undefined || v === '' ? undefined : v;
    },
  };
  const metrics: McpMetricsPort = { recordConnect: jest.fn(), recordCall: jest.fn() };
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

  it('starts from defaultHeaders', () => {
    const svc = makeService({});
    expect(
      svc.mergeHeaders(cfg({ allowedHosts: ['mcp.linear.app'], defaultHeaders: { 'X-Trace': 'on' } }), url),
    ).toEqual({ 'X-Trace': 'on' });
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
    ).toEqual({ Authorization: 'Bearer abc' });
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
      Authorization: 'Bearer xyz',
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
    ).toEqual({ 'X-Trace': 'on' });
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
    ).toEqual({ 'X-Trace': 'linear' });
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
    ).toEqual({ 'X-Source': 'host' });
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
      ).toEqual({ Authorization: 'real' });
    } finally {
      delete process.env.__MCP_TEST_TOKEN__;
    }
  });
});
