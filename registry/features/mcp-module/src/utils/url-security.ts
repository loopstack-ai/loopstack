import * as dns from 'node:dns/promises';
import * as net from 'node:net';
import { domainToASCII } from 'node:url';
import { McpUrlSecurityError } from '../errors.js';

function toAscii(host: string): string {
  const ascii = domainToASCII(host);
  return (ascii || host).toLowerCase();
}

function normalizePattern(pattern: string): string {
  const p = pattern.toLowerCase();
  if (p.startsWith('*.')) return `*.${toAscii(p.slice(2))}`;
  return toAscii(p);
}

/** Returns true if hostname is allowed by `allowedHosts` (exact or `*.suffix`). */
export function hostMatchesAllowlist(hostname: string, allowedHosts: string[]): boolean {
  const host = toAscii(hostname);

  for (const pattern of allowedHosts) {
    const p = normalizePattern(pattern);
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

/**
 * Expands an IPv6 address into its 8 16-bit groups. Handles `::` compression and the
 * dotted-quad tail used by IPv4-mapped / IPv4-compatible addresses (e.g. `::ffff:1.2.3.4`).
 * Returns `undefined` on parse failure.
 */
function expandIpv6ToGroups(ip: string): number[] | undefined {
  let s = ip.toLowerCase().split('%')[0] ?? '';

  const dotted = s.match(/^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dotted) {
    const v4 = dotted[2].split('.').map(Number);
    if (v4.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return undefined;
    const hi = (v4[0] << 8) | v4[1];
    const lo = (v4[2] << 8) | v4[3];
    s = `${dotted[1]}${hi.toString(16)}:${lo.toString(16)}`;
  }

  const halves = s.split('::');
  if (halves.length > 2) return undefined;

  const head = halves[0] ? halves[0].split(':') : [];
  let parts: string[];
  if (halves.length === 2) {
    const tail = halves[1] ? halves[1].split(':') : [];
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return undefined;
    parts = [...head, ...Array<string>(missing).fill('0'), ...tail];
  } else {
    parts = head;
  }

  if (parts.length !== 8) return undefined;

  const groups: number[] = [];
  for (const p of parts) {
    if (!/^[0-9a-f]{1,4}$/.test(p)) return undefined;
    groups.push(parseInt(p, 16));
  }
  return groups;
}

function groupsToIpv4(hi: number, lo: number): string {
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

/**
 * If the IPv6 address embeds an IPv4 address — 6to4 (`2002::/16`) or IPv4-mapped
 * (`::ffff:0:0/96`, both shorthand and fully expanded) — returns the embedded IPv4
 * in dotted-quad form. Used to block SSRF via v6-encoded private ranges.
 */
function embeddedIpv4(groups: number[]): string | undefined {
  if (groups[0] === 0x2002) {
    return groupsToIpv4(groups[1], groups[2]);
  }
  if (
    groups[0] === 0 &&
    groups[1] === 0 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0xffff
  ) {
    return groupsToIpv4(groups[6], groups[7]);
  }
  return undefined;
}

function isPrivateIpv6(ip: string): boolean {
  const n = ip.toLowerCase();

  if (n === '::1') return true;
  if (n === '::') return true;
  if (n.startsWith('fe80:')) return true;
  if (n.startsWith('64:ff9b:')) return true;

  const first = n.split(':')[0] ?? '';

  if (first.startsWith('fc') || first.startsWith('fd')) return true;
  if (first.startsWith('ff')) return true;

  const groups = expandIpv6ToGroups(n);
  if (groups) {
    const v4 = embeddedIpv4(groups);
    if (v4 !== undefined && isPrivateIpv4(v4)) return true;
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
