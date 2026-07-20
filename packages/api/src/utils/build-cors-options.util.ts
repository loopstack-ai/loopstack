import type { CorsOptions } from 'cors';
import type { ModuleOptionsInterface } from '../interfaces/index.js';

const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** Any `http(s)://localhost:<port>` (or loopback IP) origin, on any port. */
function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname, protocol } = new URL(origin);
    return (protocol === 'http:' || protocol === 'https:') && LOCALHOST_HOSTNAMES.has(hostname);
  } catch {
    return false;
  }
}

function resolveAllowedOrigins(options: ModuleOptionsInterface): string[] {
  if (options.corsOrigins?.length) {
    return options.corsOrigins;
  }
  const fromEnv = process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL;
  return fromEnv
    ? fromEnv
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : [];
}

/**
 * Resolve the CORS configuration for the API middleware.
 *
 * - When `options.cors` is provided it is used verbatim (full override / `false` to disable).
 * - Otherwise a credentialed policy is built that reflects any localhost origin plus the configured
 *   allowlist, and rejects every other origin. Arbitrary origins are never reflected.
 */
export function buildCorsOptions(options: ModuleOptionsInterface): CorsOptions | false {
  if (options.cors !== undefined) {
    return options.cors;
  }

  const allowedOrigins = resolveAllowedOrigins(options);

  return {
    credentials: true,
    origin: (origin, callback) => {
      // No Origin header: same-origin navigations and non-browser clients (curl, server-to-server).
      if (!origin || isLocalhostOrigin(origin) || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  };
}
