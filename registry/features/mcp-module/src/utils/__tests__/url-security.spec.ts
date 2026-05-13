import * as dns from 'node:dns/promises';
import { McpUrlSecurityError } from '../../errors';
import { assertIpIsPublic, assertMcpUrlSafe, hostMatchesAllowlist } from '../url-security';

jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}));

const mockedLookup = dns.lookup as unknown as jest.Mock;

beforeEach(() => {
  mockedLookup.mockReset();
});

describe('hostMatchesAllowlist', () => {
  it('matches exact hostnames case-insensitively', () => {
    expect(hostMatchesAllowlist('mcp.linear.app', ['mcp.linear.app'])).toBe(true);
    expect(hostMatchesAllowlist('MCP.LINEAR.APP', ['mcp.linear.app'])).toBe(true);
  });

  it('rejects unrelated hostnames', () => {
    expect(hostMatchesAllowlist('evil.com', ['mcp.linear.app'])).toBe(false);
  });

  it('matches the wildcard root', () => {
    expect(hostMatchesAllowlist('example.com', ['*.example.com'])).toBe(true);
  });

  it('matches wildcard subdomains', () => {
    expect(hostMatchesAllowlist('api.example.com', ['*.example.com'])).toBe(true);
    expect(hostMatchesAllowlist('a.b.example.com', ['*.example.com'])).toBe(true);
  });

  it('does not accidentally match adversarial suffixes', () => {
    expect(hostMatchesAllowlist('notexample.com', ['*.example.com'])).toBe(false);
    expect(hostMatchesAllowlist('example.com.evil.com', ['*.example.com'])).toBe(false);
  });
});

describe('assertIpIsPublic', () => {
  it.each([
    '10.0.0.1',
    '127.0.0.1',
    '169.254.1.1',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '100.64.0.1',
    '0.0.0.0',
  ])('rejects private IPv4 %s', (ip) => {
    expect(() => assertIpIsPublic(ip)).toThrow(McpUrlSecurityError);
  });

  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '172.15.255.255'])('accepts public IPv4 %s', (ip) => {
    expect(() => assertIpIsPublic(ip)).not.toThrow();
  });

  it.each(['::1', 'fe80::1', 'fc00::1', 'fd12:3456:789a::1', '::ffff:127.0.0.1'])('rejects private IPv6 %s', (ip) => {
    expect(() => assertIpIsPublic(ip)).toThrow(McpUrlSecurityError);
  });

  it('rejects invalid IPs', () => {
    expect(() => assertIpIsPublic('not-an-ip')).toThrow(McpUrlSecurityError);
  });
});

describe('assertMcpUrlSafe', () => {
  it('returns a URL for an allowlisted https host (skipping DNS)', async () => {
    const url = await assertMcpUrlSafe('https://mcp.linear.app/sse', ['mcp.linear.app'], false, {
      skipDnsResolution: true,
    });
    expect(url.hostname).toBe('mcp.linear.app');
  });

  it('rejects plain http unless allowInsecureHttp', async () => {
    await expect(
      assertMcpUrlSafe('http://mcp.linear.app/sse', ['mcp.linear.app'], false, {
        skipDnsResolution: true,
      }),
    ).rejects.toThrow(McpUrlSecurityError);

    await expect(
      assertMcpUrlSafe('http://mcp.linear.app/sse', ['mcp.linear.app'], true, {
        skipDnsResolution: true,
      }),
    ).resolves.toBeInstanceOf(URL);
  });

  it('rejects userinfo in the URL', async () => {
    await expect(
      assertMcpUrlSafe('https://user:pw@mcp.linear.app/sse', ['mcp.linear.app'], false, {
        skipDnsResolution: true,
      }),
    ).rejects.toThrow(McpUrlSecurityError);
  });

  it('rejects hosts not in the allowlist', async () => {
    await expect(
      assertMcpUrlSafe('https://evil.com/sse', ['mcp.linear.app'], false, {
        skipDnsResolution: true,
      }),
    ).rejects.toThrow(McpUrlSecurityError);
  });

  it('rejects when DNS resolves to a private IP', async () => {
    mockedLookup.mockResolvedValueOnce([{ address: '10.0.0.1', family: 4 }]);

    await expect(assertMcpUrlSafe('https://mcp.linear.app/sse', ['mcp.linear.app'], false)).rejects.toThrow(
      McpUrlSecurityError,
    );
  });

  it('accepts when DNS resolves to a public IP', async () => {
    mockedLookup.mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }]);

    const url = await assertMcpUrlSafe('https://mcp.linear.app/sse', ['mcp.linear.app'], false);
    expect(url.hostname).toBe('mcp.linear.app');
  });

  it('skips DNS when allowPrivateHosts is true', async () => {
    const url = await assertMcpUrlSafe('https://localhost/sse', ['localhost'], false, {
      allowPrivateHosts: true,
    });
    expect(url.hostname).toBe('localhost');
    expect(mockedLookup).not.toHaveBeenCalled();
  });
});
