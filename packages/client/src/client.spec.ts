import { describe, expect, it } from 'vitest';
import { createClient } from './client.js';
import { LoopstackApiError } from './http.js';
import { queryKeys } from './queries/query-keys.js';

interface RecordedCall {
  url: string;
  init: RequestInit;
}

function createMockFetch(responses: Array<{ status?: number; body?: unknown }> = [{ body: {} }]) {
  const calls: RecordedCall[] = [];
  let index = 0;
  const fetchFn = (async (url: URL | RequestInfo, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses[Math.min(index++, responses.length - 1)];
    return new Response(next.body === undefined ? '' : JSON.stringify(next.body), {
      status: next.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  return { calls, fetchFn };
}

const URL_BASE = 'http://loopstack.test';

describe('createClient http behavior', () => {
  it('injects the bearer token and JSON headers', async () => {
    const { calls, fetchFn } = createMockFetch();
    const client = createClient({ url: URL_BASE, token: 'lsk_abc', fetch: fetchFn });

    await client.processor.start({ workflowName: 'hello', workspaceId: 'ws' });

    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer lsk_abc');
    expect(headers['Content-Type']).toBe('application/json');
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ workflowName: 'hello', workspaceId: 'ws' });
  });

  it('omits the Authorization header without a token and defaults credentials to include', async () => {
    const { calls, fetchFn } = createMockFetch();
    const client = createClient({ url: URL_BASE, fetch: fetchFn });

    await client.workflows.get('wf-1');

    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(calls[0].init.credentials).toBe('include');
    expect(calls[0].url).toBe(`${URL_BASE}/api/v1/workflows/wf-1`);
  });

  it('JSON-encodes object query params and drops undefined ones', async () => {
    const { calls, fetchFn } = createMockFetch();
    const client = createClient({ url: URL_BASE, fetch: fetchFn });

    await client.workflows.list({
      filter: { workspaceId: 'ws-1' },
      sortBy: [{ field: 'createdAt', order: 'DESC' as never }],
      page: 3,
      search: undefined,
    });

    const url = new URL(calls[0].url);
    expect(JSON.parse(url.searchParams.get('filter')!)).toEqual({ workspaceId: 'ws-1' });
    expect(JSON.parse(url.searchParams.get('sortBy')!)).toEqual([{ field: 'createdAt', order: 'DESC' }]);
    expect(url.searchParams.get('page')).toBe('3');
    expect(url.searchParams.has('search')).toBe(false);
  });

  it('normalizes API errors with the server message', async () => {
    const { fetchFn } = createMockFetch([
      { status: 400, body: { message: ['workflowName: required'], error: 'Bad Request', statusCode: 400 } },
    ]);
    const client = createClient({ url: URL_BASE, fetch: fetchFn });

    const error = await client.workflows.get('wf-1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LoopstackApiError);
    expect((error as LoopstackApiError).status).toBe(400);
    expect((error as LoopstackApiError).message).toContain('workflowName');
  });

  it('resolves empty responses as undefined', async () => {
    const { fetchFn } = createMockFetch([{ body: undefined, status: 200 }]);
    const client = createClient({ url: URL_BASE, fetch: fetchFn });

    await expect(client.processor.run('wf-1')).resolves.toBeUndefined();
  });

  it('trims trailing slashes off the base url', async () => {
    const { calls, fetchFn } = createMockFetch();
    const client = createClient({ url: `${URL_BASE}///`, fetch: fetchFn });

    await client.documents.get('doc-1');
    expect(calls[0].url).toBe(`${URL_BASE}/api/v1/documents/doc-1`);
  });
});

describe('query descriptors', () => {
  it('scopes every key by envKey and defaults envKey to the url', () => {
    const { fetchFn } = createMockFetch();
    const client = createClient({ url: URL_BASE, fetch: fetchFn });

    expect(client.envKey).toBe(URL_BASE);
    expect(client.queries.workflow('wf-1').queryKey).toEqual(['workflow', URL_BASE, 'wf-1']);
    expect(client.queries.documents('wf-1').queryKey).toEqual(['documents', URL_BASE, 'wf-1']);
  });

  it('respects an explicit envKey', () => {
    const { fetchFn } = createMockFetch();
    const client = createClient({ url: URL_BASE, envKey: 'local', fetch: fetchFn });

    expect(client.queries.workflowStatus('wf-1').queryKey).toEqual(queryKeys.workflowStatus('local', 'wf-1'));
    expect(client.queries.childWorkflows('wf-0').queryKey).toEqual(['childWorkflows', 'local', 'wf-0']);
  });

  it('documents queryFn requests visible documents in display order', async () => {
    const { calls, fetchFn } = createMockFetch([{ body: { data: [], total: 0, page: 1, limit: 100 } }]);
    const client = createClient({ url: URL_BASE, fetch: fetchFn });

    await client.queries.documents('wf-1').queryFn();

    const url = new URL(calls[0].url);
    expect(JSON.parse(url.searchParams.get('filter')!)).toEqual({ workflowId: 'wf-1', isInvalidated: false });
    expect(JSON.parse(url.searchParams.get('sortBy')!)).toEqual([{ field: 'index', order: 'ASC' }]);
  });

  it('list keys are prefixed by the plural key so broad invalidation catches them', () => {
    const { fetchFn } = createMockFetch();
    const client = createClient({ url: URL_BASE, envKey: 'local', fetch: fetchFn });

    const listKey = client.queries.workflowList({ page: 1 }).queryKey;
    const pluralKey = queryKeys.workflows('local');
    expect(listKey.slice(0, pluralKey.length)).toEqual(pluralKey);

    const workspaceListKey = client.queries.workspaceList({ page: 1 }).queryKey;
    const workspacesKey = queryKeys.workspaces('local');
    expect(workspaceListKey.slice(0, workspacesKey.length)).toEqual(workspacesKey);
  });
});

describe('workspaces resource', () => {
  it('setFavourite sends a PATCH to the favourite endpoint', async () => {
    const { calls, fetchFn } = createMockFetch([{ body: { id: 'ws-1' } }]);
    const client = createClient({ url: URL_BASE, fetch: fetchFn });

    await client.workspaces.setFavourite('ws-1', true);

    expect(calls[0].init?.method).toBe('PATCH');
    expect(new URL(calls[0].url).pathname).toBe('/api/v1/workspaces/ws-1/favourite');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({ isFavourite: true });
  });

  it('delete and batchDelete hit the id/ and batch routes', async () => {
    const { calls, fetchFn } = createMockFetch([{ body: undefined }, { body: { deleted: ['a'], failed: [] } }]);
    const client = createClient({ url: URL_BASE, fetch: fetchFn });

    await client.workspaces.delete('ws-1');
    await client.workspaces.batchDelete(['a']);

    expect(new URL(calls[0].url).pathname).toBe('/api/v1/workspaces/id/ws-1');
    expect(new URL(calls[1].url).pathname).toBe('/api/v1/workspaces/batch');
    expect(JSON.parse(calls[1].init?.body as string)).toEqual({ ids: ['a'] });
  });
});
