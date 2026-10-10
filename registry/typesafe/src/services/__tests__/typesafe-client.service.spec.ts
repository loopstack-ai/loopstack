import { choice, noul } from '@typesafe-ai/sdk';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { TypeSafeClientService } from '../typesafe-client.service.js';

describe('TypeSafeClientService', () => {
  const service = new TypeSafeClientService();
  const fetchMock = vi.fn<typeof fetch>();

  const apiResult = {
    model: 'jev-latest',
    answers: {
      category: { type: 'choice', choice: 'billing', confidence: 0.9, probabilities: { billing: 0.9, other: 0.1 } },
      urgent: { type: 'noul', noul: 0.8 },
    },
    usage: { input_tokens: 42, output_tokens: 2 },
  };

  beforeEach(() => {
    vi.stubEnv('TYPESAFE_API_KEY', 'ts-default');
    vi.stubEnv('TYPESAFE_DEFAULT_MODEL', '');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(apiResult), { status: 200, headers: { 'content-type': 'application/json' } }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('throws naming the env var when the API key is missing', () => {
    vi.stubEnv('TYPESAFE_API_KEY', '');
    expect(() => service.getClient()).toThrow('No API key found! Please make sure to provide "TYPESAFE_API_KEY"');
    expect(() => service.getClient({ envApiKey: 'OTHER_KEY' })).toThrow('"OTHER_KEY"');
  });

  it('uses the SDK default model unless one is given', () => {
    expect(service.getClient().defaultModel).toBe('jev-latest');
    expect(service.getClient({ model: 'jev-2' }).defaultModel).toBe('jev-2');
  });

  it('posts state, questions and model to /v1/systemone with the key from the env var', async () => {
    vi.stubEnv('MY_TYPESAFE_KEY', 'ts-override');

    const result = await service.systemOne(
      {
        state: { document: 'I was charged twice.' },
        questions: {
          category: choice('What is this ticket about?', { billing: null, other: null }),
          urgent: noul('Is this urgent?'),
        },
      },
      { envApiKey: 'MY_TYPESAFE_KEY' },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.typesafe.ai/v1/systemone');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer ts-override');
    expect(JSON.parse(init?.body as string)).toEqual({
      state: { document: 'I was charged twice.' },
      questions: {
        category: {
          type: 'choice',
          instructions: 'What is this ticket about?',
          criteria: { billing: null, other: null },
        },
        urgent: { type: 'noul', instructions: 'Is this urgent?' },
      },
      model: 'jev-latest',
    });
    expect(result).toEqual(apiResult);

    expectTypeOf(result.answers.category.choice).toEqualTypeOf<'billing' | 'other'>();
    expectTypeOf(result.answers.urgent.noul).toEqualTypeOf<number>();
  });

  it('passes the abort signal to the request', async () => {
    const controller = new AbortController();

    await service.systemOne({ state: 'x', questions: { q: noul('?') } }, { signal: controller.signal });

    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
