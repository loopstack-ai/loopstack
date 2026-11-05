/**
 * What a failed GitHub call says for itself.
 *
 * Three things, because a status phrase on its own ("Internal Server Error", "Bad Request") tells the person
 * reading a run nothing they can act on:
 *
 * - the **status number**, which separates a rejected request from a GitHub fault,
 * - **GitHub's own message**, which is the reason — its validation errors included, flattened,
 * - the **request id**, which is what is left when a 5xx arrives with an empty body, and the only thing
 *   GitHub support can look up.
 *
 * The result is one line, short enough to carry in a tool error, a document or an issue comment.
 */

/** How much of an unparsable body is carried along. Enough for a reason, not for an HTML error page. */
export const GITHUB_ERROR_BODY_LIMIT = 300;

/**
 * The shape GitHub answers an error with: `message`/`errors` from the REST API, `error`/`error_description`
 * from the OAuth endpoints. Every field is absent on a fault that produced no body.
 */
interface GitHubErrorBody {
  message?: string;
  errors?: (string | { message?: string; field?: string; code?: string })[];
  error?: string;
  error_description?: string;
}

/** One validation error as a phrase: GitHub gives a message, or a field and the code that rejected it. */
function describeError(error: NonNullable<GitHubErrorBody['errors']>[number]): string | undefined {
  if (typeof error === 'string') return error.trim() || undefined;
  if (error.message?.trim()) return error.message.trim();
  if (error.field && error.code) return `${error.field} ${error.code}`;
  return error.field ?? error.code;
}

/** GitHub's reason for the failure, as far as the body gives one. */
function describeBody(raw: string): string | undefined {
  const body = raw.trim();
  if (!body) return undefined;
  try {
    const parsed = JSON.parse(body) as GitHubErrorBody | null;
    const message = parsed?.message?.trim() || parsed?.error_description?.trim() || parsed?.error?.trim();
    const errors = (parsed?.errors ?? []).map(describeError).filter((entry): entry is string => !!entry);
    if (message && errors.length) return `${message}: ${errors.join(', ')}`;
    if (message) return message;
    if (errors.length) return errors.join(', ');
  } catch {
    /* not JSON — the body itself is the best reason there is */
  }
  return body.length > GITHUB_ERROR_BODY_LIMIT ? `${body.slice(0, GITHUB_ERROR_BODY_LIMIT)}…` : body;
}

/**
 * The one-line reason a GitHub call failed, for the tool error and the log alike.
 *
 * Reads the response body, so it is called once per failed response. `prefix` names the call for a surface
 * that is not a tool — the OAuth token exchange, whose failure is not an API error to the person reading it.
 *
 * @example
 * ```
 * GitHub API error: 422 Unprocessable Entity — Validation Failed: name already_exists (request id C4E2:1A0F)
 * GitHub API error: 500 Internal Server Error — no response body (request id D1A8:2B33)
 * ```
 *
 * @public
 */
export async function githubApiError(response: Response, prefix = 'GitHub API error'): Promise<string> {
  const raw = await response.text().catch(() => '');
  const reason = describeBody(raw) ?? 'no response body';
  const requestId = response.headers?.get?.('x-github-request-id');
  const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
  return `${prefix}: ${status} — ${reason}${requestId ? ` (request id ${requestId})` : ''}`;
}
