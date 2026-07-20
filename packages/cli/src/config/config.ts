import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { CliError } from '../errors.js';

export interface EnvironmentConfig {
  url: string;
  token?: string;
  /** CLI-owned default workspace for zero-ceremony runs (created lazily). */
  workspaceId?: string;
  /** Studio frontend of this environment — enables deep links in run output. */
  studioUrl?: string;
}

export interface CliConfig {
  defaultEnvironment?: string;
  environments: Record<string, EnvironmentConfig>;
}

export function configPath(): string {
  return join(homedir(), '.loopstack', 'config.json');
}

export function loadConfig(path: string = configPath()): CliConfig {
  if (!existsSync(path)) {
    return { environments: {} };
  }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<CliConfig>;
    return { ...parsed, environments: parsed.environments ?? {} };
  } catch {
    throw new CliError(`Config file ${path} is not valid JSON — fix or delete it.`);
  }
}

/** Tokens live in this file — written user-only (0600). */
export function saveConfig(config: CliConfig, path: string = configPath()): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  chmodSync(path, 0o600);
}
