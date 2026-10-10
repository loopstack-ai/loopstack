import { describe, expect, it } from 'vitest';
import { McpToolConfigSchema } from '../mcp-tool-config.schema.js';

describe('McpToolConfigSchema', () => {
  it('requires at least one allowed host', () => {
    const result = McpToolConfigSchema.safeParse({ allowedHosts: [] });
    expect(result.success).toBe(false);
  });

  it('accepts a minimal valid config', () => {
    const result = McpToolConfigSchema.safeParse({ allowedHosts: ['mcp.linear.app'] });
    expect(result.success).toBe(true);
  });

  it('applies defaults for allowInsecureHttp and allowPrivateHosts', () => {
    const result = McpToolConfigSchema.parse({ allowedHosts: ['mcp.linear.app'] });
    expect(result.allowInsecureHttp).toBe(false);
    expect(result.allowPrivateHosts).toBe(false);
  });

  it.each([['Authorization'], ['authorization'], ['Cookie'], ['Proxy-Authorization'], ['X-API-Key']])(
    'rejects %s in defaultHeaders',
    (header) => {
      const result = McpToolConfigSchema.safeParse({
        allowedHosts: ['mcp.linear.app'],
        defaultHeaders: { [header]: 'secret' },
      });
      expect(result.success).toBe(false);
    },
  );

  it('allows non-sensitive headers in defaultHeaders', () => {
    const result = McpToolConfigSchema.safeParse({
      allowedHosts: ['mcp.linear.app'],
      defaultHeaders: { 'X-Trace': 'on', 'User-Agent': 'loopstack' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown keys (strict mode)', () => {
    const result = McpToolConfigSchema.safeParse({
      allowedHosts: ['mcp.linear.app'],
      unknownKey: 'x',
    });
    expect(result.success).toBe(false);
  });
});
