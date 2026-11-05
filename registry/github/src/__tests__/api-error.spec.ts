import { describe, expect, it } from 'vitest';
import { GITHUB_ERROR_BODY_LIMIT, githubApiError } from '../api-error.js';

/** A response as GitHub sends one, with the request id it puts on every answer. */
function reply(status: number, statusText: string, body: string, requestId = 'C4E2:1A0F'): Response {
  return new Response(body, { status, statusText, headers: { 'x-github-request-id': requestId } });
}

describe('githubApiError', () => {
  it('carries the status number, GitHub’s message and its validation errors', async () => {
    const body = JSON.stringify({
      message: 'Validation Failed',
      errors: [{ field: 'name', code: 'already_exists' }, { message: 'label is too long' }],
    });

    expect(await githubApiError(reply(422, 'Unprocessable Entity', body))).toBe(
      'GitHub API error: 422 Unprocessable Entity — Validation Failed: name already_exists, label is too long ' +
        '(request id C4E2:1A0F)',
    );
  });

  it('says so when a fault arrives with no body — the request id is then all there is', async () => {
    // The shape of the 500 that made a capture fail with nothing to go on.
    expect(await githubApiError(reply(500, 'Internal Server Error', '', 'D1A8:2B33'))).toBe(
      'GitHub API error: 500 Internal Server Error — no response body (request id D1A8:2B33)',
    );
  });

  it('passes a body that is not JSON through as the reason', async () => {
    expect(await githubApiError(reply(404, 'Not Found', 'missing'))).toBe(
      'GitHub API error: 404 Not Found — missing (request id C4E2:1A0F)',
    );
  });

  it('truncates a long body instead of carrying a page of it', async () => {
    const long = 'x'.repeat(GITHUB_ERROR_BODY_LIMIT + 50);
    const error = await githubApiError(reply(502, 'Bad Gateway', long));

    expect(error).toContain(`${'x'.repeat(GITHUB_ERROR_BODY_LIMIT)}…`);
    expect(error).not.toContain('x'.repeat(GITHUB_ERROR_BODY_LIMIT + 1));
  });

  it('leaves out a request id the response does not carry', async () => {
    const response = new Response('nope', { status: 403, statusText: 'Forbidden' });

    expect(await githubApiError(response)).toBe('GitHub API error: 403 Forbidden — nope');
  });
});
