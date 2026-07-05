import { createClient } from '@loopstack/client';
import type { LoopstackClient } from '@loopstack/client';
import { CliError } from '../errors.js';
import { loadConfig } from './config.js';
import type { CliConfig } from './config.js';

export interface ConnectionFlags {
  env?: string;
  url?: string;
  token?: string;
}

export interface ResolvedConnection {
  /** Environment name when resolved from config, else the URL. */
  name: string;
  url: string;
  token?: string;
  workspaceId?: string;
  /** Studio frontend for deep links — saved via `login`, `LOOPSTACK_STUDIO_URL`, or the local default. */
  studioUrl?: string;
  source: 'flags' | 'env-vars' | 'config' | 'default';
}

const LOCAL_URL = 'http://localhost:3000';
const LOCAL_STUDIO_URL = 'http://localhost:5173';

/**
 * Resolves which backend to talk to. Precedence:
 * `--url` / `--env` flags → `LOOPSTACK_URL`/`LOOPSTACK_TOKEN` env vars →
 * the config file's default environment → local dev fallback.
 * A `--token` flag or `LOOPSTACK_TOKEN` overrides a saved token either way;
 * `LOOPSTACK_STUDIO_URL` overrides the saved Studio URL the same way.
 */
export function resolveConnection(
  flags: ConnectionFlags,
  env: NodeJS.ProcessEnv = process.env,
  config: CliConfig = loadConfig(),
): ResolvedConnection {
  const tokenOverride = flags.token ?? env.LOOPSTACK_TOKEN;
  const studioOverride = env.LOOPSTACK_STUDIO_URL;

  if (flags.url) {
    return { name: flags.url, url: flags.url, token: tokenOverride, studioUrl: studioOverride, source: 'flags' };
  }

  if (flags.env) {
    const saved = config.environments[flags.env];
    if (!saved) {
      throw new CliError(`Unknown environment "${flags.env}" — run \`loopstack env list\` or \`loopstack login\`.`);
    }
    return {
      name: flags.env,
      url: saved.url,
      token: tokenOverride ?? saved.token,
      workspaceId: saved.workspaceId,
      studioUrl: studioOverride ?? saved.studioUrl,
      source: 'flags',
    };
  }

  if (env.LOOPSTACK_URL) {
    return {
      name: env.LOOPSTACK_URL,
      url: env.LOOPSTACK_URL,
      token: tokenOverride,
      studioUrl: studioOverride,
      source: 'env-vars',
    };
  }

  if (config.defaultEnvironment && config.environments[config.defaultEnvironment]) {
    const saved = config.environments[config.defaultEnvironment];
    return {
      name: config.defaultEnvironment,
      url: saved.url,
      token: tokenOverride ?? saved.token,
      workspaceId: saved.workspaceId,
      studioUrl: studioOverride ?? saved.studioUrl,
      source: 'config',
    };
  }

  return {
    name: 'local',
    url: LOCAL_URL,
    token: tokenOverride,
    studioUrl: studioOverride ?? LOCAL_STUDIO_URL,
    source: 'default',
  };
}

export function createClientFor(connection: ResolvedConnection): LoopstackClient {
  return createClient({ url: connection.url, token: connection.token, envKey: connection.name });
}
