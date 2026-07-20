// Proves @loopstack/client runs in bare Node: imports the built ESM output
// and exercises a fetcher against a stubbed fetch. Run `npm run build` first.
import assert from 'node:assert/strict';

const { createClient, LoopstackApiError } = await import('../dist/index.js').catch((error) => {
  console.error('bare-node check requires a build (npm run build):', error.message);
  process.exit(1);
});

const calls = [];
const client = createClient({
  url: 'http://loopstack.test',
  token: 'lsk_test',
  fetch: async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ data: [], total: 0, page: 1, limit: 100 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});

const result = await client.workflows.list({ filter: { parentId: null }, page: 2 });
assert.equal(result.total, 0);
assert.match(calls[0].url, /\/api\/v1\/workflows\?/);
assert.match(calls[0].url, /filter=%7B%22parentId%22%3Anull%7D/);
assert.match(calls[0].url, /page=2/);
assert.equal(calls[0].init.headers.Authorization, 'Bearer lsk_test');

const failing = createClient({
  url: 'http://loopstack.test',
  fetch: async () =>
    new Response(JSON.stringify({ message: ['nope'], statusCode: 400 }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }),
});
await assert.rejects(
  () => failing.workflows.get('x'),
  (error) => error instanceof LoopstackApiError && error.status === 400,
);

console.log('bare-node check OK');
