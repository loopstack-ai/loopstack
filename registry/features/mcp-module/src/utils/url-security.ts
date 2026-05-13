import * as dns from 'node:dns/promises';
import * as net from 'node:net';
import { McpUrlSecurityError } from '../errors';

export { McpUrlSecurityError };

/** Returns true if hostname is allowed by `allowedHosts` (exact or `*.suffix`). */
export function hostMatchesAllowlist(hostname: string, allowedHosts: string[]): boolean {
  const host = hostname.toLowerCase();

  for (const pattern of allowedHosts) {
    const p = pattern.toLowerCase();
    if (p.startsWith('*.')) {
      const root = p.slice(2);
      if (host === root) return true;
      const suffix = `.${root}`;
      if (host.endsWith(suffix) && host.length > suffix.length) return true;
    } else if (host === p) {
      return true;
    }
  }

  return false;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((x) => Number(x));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }

  const [a, b] = parts;

  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const n = ip.toLowerCase();

  if (n === '::1') return true;
  if (n.startsWith('fe80:')) return true;

  const first = n.split(':')[0] ?? '';

  if (first.startsWith('fc') || first.startsWith('fd')) return true;

  if (n.includes('::ffff:')) {
    const v4 = n.split('::ffff:')[1];
    if (v4 && net.isIPv4(v4)) return isPrivateIpv4(v4);
  }

  return false;
}

/** Rejects loopback, link-local, ULA, RFC1918, and similar addresses. */
export function assertIpIsPublic(ip: string): void {
  const family = net.isIP(ip);
  if (family === 0) {
    throw new McpUrlSecurityError('Invalid IP address from resolution.');
  }
  if (family === 4 && isPrivateIpv4(ip)) {
    throw new McpUrlSecurityError('Refusing to connect to a non-public IPv4 address.');
  }
  if (family === 6 && isPrivateIpv6(ip)) {
    throw new McpUrlSecurityError('Refusing to connect to a non-public IPv6 address.');
  }
}

/**
 * If `host` is a literal IP, validates it is public. Otherwise resolves DNS and rejects if any A/AAAA is non-public.
 */
export async function assertResolvableHostIsPublic(host: string): Promise<void> {
  if (net.isIP(host)) {
    assertIpIsPublic(host);
    return;
  }

  let records;
  try {
    records = await dns.lookup(host, { all: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new McpUrlSecurityError(`DNS lookup failed for "${host}": ${msg}`);
  }

  if (records.length === 0) {
    throw new McpUrlSecurityError(`No DNS records for "${host}".`);
  }

  for (const r of records) {
    assertIpIsPublic(r.address);
  }
}

export async function assertMcpUrlSafe(
  rawUrl: string,
  allowedHosts: string[],
  allowInsecureHttp: boolean,
  options?: { skipDnsResolution?: boolean; allowPrivateHosts?: boolean },
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new McpUrlSecurityError('Invalid serverUrl.');
  }

  if (url.username || url.password) {
    throw new McpUrlSecurityError('Userinfo in serverUrl is not allowed; use headers or headerEnv in tool config.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new McpUrlSecurityError('Only http and https MCP URLs are supported.');
  }

  if (url.protocol === 'http:' && !allowInsecureHttp) {
    throw new McpUrlSecurityError('HTTP is disabled; use https or set allowInsecureHttp on the tool injection config.');
  }

  const hostname = url.hostname;
  if (!hostname) {
    throw new McpUrlSecurityError('Missing hostname in serverUrl.');
  }

  if (!hostMatchesAllowlist(hostname, allowedHosts)) {
    throw new McpUrlSecurityError(`Hostname "${hostname}" is not in allowedHosts.`);
  }

  if (!options?.skipDnsResolution && !options?.allowPrivateHosts) {
    await assertResolvableHostIsPublic(hostname);
  }

  return url;
}
