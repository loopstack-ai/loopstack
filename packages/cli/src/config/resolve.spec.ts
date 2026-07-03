import { describe, expect, it } from 'vitest';
import { CliError } from '../errors.js';
import type { CliConfig } from './config.js';
import { resolveConnection } from './resolve.js';

const config: CliConfig = {
  defaultEnvironment: 'prod',
  environments: {
    prod: { url: 'https://api.example.com', token: 'lsk_saved', workspaceId: 'ws-1' },
    staging: { url: 'https://staging.example.com' },
  },
};

const noEnv = {} as NodeJS.ProcessEnv;

describe('resolveConnection', () => {
  it('--url wins over everything', () => {
    const resolved = resolveConnection({ url: 'http://other:4000' }, { LOOPSTACK_URL: 'http://ignored' }, config);
    expect(resolved).toMatchObject({ url: 'http://other:4000', source: 'flags' });
  });

  it('--env picks the named environment with its saved token and workspace', () => {
    const resolved = resolveConnection({ env: 'prod' }, noEnv, config);
    expect(resolved).toMatchObject({
      name: 'prod',
      url: 'https://api.example.com',
      token: 'lsk_saved',
      workspaceId: 'ws-1',
    });
  });

  it('--env with unknown name throws', () => {
    expect(() => resolveConnection({ env: 'nope' }, noEnv, config)).toThrow(CliError);
  });

  it('--token overrides the saved token', () => {
    const resolved = resolveConnection({ env: 'prod', token: 'lsk_flag' }, { LOOPSTACK_TOKEN: 'lsk_env' }, config);
    expect(resolved.token).toBe('lsk_flag');
  });

  it('LOOPSTACK_TOKEN overrides the saved token', () => {
    const resolved = resolveConnection({ env: 'prod' }, { LOOPSTACK_TOKEN: 'lsk_env' }, config);
    expect(resolved.token).toBe('lsk_env');
  });

  it('LOOPSTACK_URL wins over the config default', () => {
    const resolved = resolveConnection({}, { LOOPSTACK_URL: 'http://ci:3000', LOOPSTACK_TOKEN: 'lsk_ci' }, config);
    expect(resolved).toMatchObject({ url: 'http://ci:3000', token: 'lsk_ci', source: 'env-vars' });
  });

  it('falls back to the config default environment', () => {
    const resolved = resolveConnection({}, noEnv, config);
    expect(resolved).toMatchObject({ name: 'prod', url: 'https://api.example.com', source: 'config' });
  });

  it('falls back to local dev with no config at all', () => {
    const resolved = resolveConnection({}, noEnv, { environments: {} });
    expect(resolved).toMatchObject({
      name: 'local',
      url: 'http://localhost:3000',
      token: undefined,
      source: 'default',
    });
  });
});
