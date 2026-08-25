import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import type { CollectContext, CollectHttp, CollectIo } from '../types.js';
import { collectSecretInput } from './secret-input.collect.js';

function fakeIo(inputs: string[]): CollectIo & { transcript: () => string } {
  let text = '';
  const out = new Writable({
    write(chunk, _encoding, callback) {
      text += String(chunk);
      callback();
    },
  });
  // Like real readline: the query itself echoes to the output stream.
  const next = (query: string) => {
    out.write(query);
    return Promise.resolve(inputs.shift() ?? '');
  };
  return { ask: next, askSecret: next, out, transcript: () => text };
}

function fakeHttp(existing: { key: string; hasValue: boolean }[]) {
  const puts: { path: string; body: unknown }[] = [];
  const http: CollectHttp = {
    get: <T>() => Promise.resolve(existing as T),
    put: <T>(path: string, body?: unknown) => {
      puts.push({ path, body });
      return Promise.resolve({} as T);
    },
  };
  return { http, puts };
}

function ctxWith(http: CollectHttp, overrides: Partial<CollectContext> = {}): CollectContext {
  return {
    content: { variables: [{ key: 'API_KEY' }, { key: 'SECRET' }] },
    documentName: 'secret_request',
    options: { transition: 'secretsSubmitted', label: 'Save & Continue' },
    availableTransitions: ['secretsSubmitted'],
    workspaceId: 'ws-1',
    http,
    ...overrides,
  };
}

describe('collectSecretInput', () => {
  it('collects values without echo, upserts on confirm, and never puts values in the payload', async () => {
    const { http, puts } = fakeHttp([]);
    const io = fakeIo(['value-a', 'value-b', '1']);

    const answer = await collectSecretInput(ctxWith(http), io);

    expect(answer).toEqual({ transitionId: 'secretsSubmitted', payload: {} });
    expect(puts).toEqual([
      { path: '/api/v1/workspaces/ws-1/secrets/upsert', body: { key: 'API_KEY', value: 'value-a' } },
      { path: '/api/v1/workspaces/ws-1/secrets/upsert', body: { key: 'SECRET', value: 'value-b' } },
    ]);
    expect(io.transcript()).not.toContain('value-a');
    expect(io.transcript()).not.toContain('value-b');
  });

  it('keeps an already-set key on enter (no upsert for it)', async () => {
    const { http, puts } = fakeHttp([{ key: 'API_KEY', hasValue: true }]);
    const io = fakeIo(['', 'new-secret', '1']);

    const answer = await collectSecretInput(ctxWith(http), io);

    expect(answer).toEqual({ transitionId: 'secretsSubmitted', payload: {} });
    expect(puts).toEqual([
      { path: '/api/v1/workspaces/ws-1/secrets/upsert', body: { key: 'SECRET', value: 'new-secret' } },
    ]);
    expect(io.transcript()).toContain('already set — enter to keep');
  });

  it('declines on empty input for an unset key, storing nothing', async () => {
    const { http, puts } = fakeHttp([]);
    const io = fakeIo(['']);

    const answer = await collectSecretInput(ctxWith(http), io);

    expect(answer).toBeUndefined();
    expect(puts).toEqual([]);
  });

  it('declines when the confirm is not taken, storing nothing', async () => {
    const { http, puts } = fakeHttp([]);
    const io = fakeIo(['value-a', 'value-b', '']);

    const answer = await collectSecretInput(ctxWith(http), io);

    expect(answer).toBeUndefined();
    expect(puts).toEqual([]);
  });

  it('accepts the confirm by label as well as by number', async () => {
    const { http, puts } = fakeHttp([]);
    const io = fakeIo(['value-a', 'value-b', 'save & continue']);

    const answer = await collectSecretInput(ctxWith(http), io);

    expect(answer).toEqual({ transitionId: 'secretsSubmitted', payload: {} });
    expect(puts).toHaveLength(2);
  });

  it('reports a failed upsert and declines instead of firing the transition', async () => {
    const puts: unknown[] = [];
    const http: CollectHttp = {
      get: <T>() => Promise.resolve([] as T),
      put: () => Promise.reject(new Error('boom')),
    };
    const io = fakeIo(['value-a', 'value-b', '1']);

    const answer = await collectSecretInput(ctxWith(http), io);

    expect(answer).toBeUndefined();
    expect(puts).toEqual([]);
    expect(io.transcript()).toContain('storing secrets failed');
  });

  it('declines without http access or workspace scope', async () => {
    const io = fakeIo(['value-a']);
    const answer = await collectSecretInput(ctxWith(undefined as unknown as CollectHttp, { http: undefined }), io);
    expect(answer).toBeUndefined();
  });
});
