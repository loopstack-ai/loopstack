import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CliError } from '../errors.js';
import { loadConfig, saveConfig } from './config.js';

describe('config file', () => {
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'loopstack-cli-'));
    path = join(dir, 'nested', 'config.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns an empty config when the file does not exist', () => {
    expect(loadConfig(path)).toEqual({ environments: {} });
  });

  it('round-trips environments and default', () => {
    saveConfig(
      {
        defaultEnvironment: 'prod',
        environments: {
          prod: { url: 'https://api.example.com', token: 'lsk_abc' },
          local: { url: 'http://localhost:3000' },
        },
      },
      path,
    );
    const loaded = loadConfig(path);
    expect(loaded.defaultEnvironment).toBe('prod');
    expect(loaded.environments.prod.token).toBe('lsk_abc');
    expect(loaded.environments.local.token).toBeUndefined();
  });

  it('writes valid pretty JSON', () => {
    saveConfig({ environments: { local: { url: 'http://localhost:3000' } } }, path);
    expect(() => JSON.parse(readFileSync(path, 'utf8'))).not.toThrow();
  });

  it('throws a CliError on corrupt JSON', () => {
    saveConfig({ environments: {} }, path);
    writeFileSync(path, '{ not json');
    expect(() => loadConfig(path)).toThrow(CliError);
  });
});
