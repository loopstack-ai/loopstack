/**
 * Hostnames (or host + path prefix) that are allowed to bypass the stricter
 * content guidelines applied to arbitrary domains.
 * It is limited to well-known, code-related documentation and SDK sites.
 * SECURITY: this list is ONLY consulted to relax the secondary-model
 * content guidelines — it does NOT bypass URL validation, size caps,
 * redirect rules, or any other safety control.
 */
export const PREAPPROVED_HOSTS: ReadonlySet<string> = new Set([
  'www.typescriptlang.org',
  'nodejs.org',
  'expressjs.com',
  'jestjs.io',
  'www.mongodb.com',
  'redis.io',
  'www.postgresql.org',
  'dev.mysql.com',
  'www.sqlite.org',
  'graphql.org',
  'prisma.io',
  'docs.nestjs.com',
  'typeorm.io',
  'loopstack.ai',
]);

const { HOSTNAME_ONLY, PATH_PREFIXES } = (() => {
  const hosts = new Set<string>();
  const paths = new Map<string, string[]>();
  PREAPPROVED_HOSTS.forEach((entry) => {
    const slash = entry.indexOf('/');
    if (slash === -1) {
      hosts.add(entry);
    } else {
      const host = entry.slice(0, slash);
      const path = entry.slice(slash);
      const prefixes = paths.get(host);
      if (prefixes) prefixes.push(path);
      else paths.set(host, [path]);
    }
  });
  return { HOSTNAME_ONLY: hosts, PATH_PREFIXES: paths };
})();

export function isPreapprovedHost(hostname: string, pathname: string): boolean {
  if (HOSTNAME_ONLY.has(hostname)) return true;
  const prefixes = PATH_PREFIXES.get(hostname);
  if (prefixes) {
    for (const p of prefixes) {
      if (pathname === p || pathname.startsWith(p + '/')) return true;
    }
  }
  return false;
}

export function isPreapprovedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return isPreapprovedHost(parsed.hostname, parsed.pathname);
  } catch {
    return false;
  }
}
