import * as path from 'node:path';

export const AGENT_PORT = Number(process.env.AGENT_PORT) || 3001;
export const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/workspace';

/** Roots the file routes are allowed to touch — the workspace and the OS temp dir. */
export const ALLOWED_ROOTS = [path.resolve(WORKSPACE_ROOT), '/tmp/'];

/** Resolve a request path against the workspace, rejecting anything that escapes {@link ALLOWED_ROOTS}. */
export function resolveSafePath(requestedPath: string): string {
  const resolved = path.resolve(WORKSPACE_ROOT, requestedPath);
  const isAllowed = ALLOWED_ROOTS.some((root) => resolved.startsWith(root));
  if (!isAllowed) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

/** Per-session cost ceiling passed to `claude --max-budget-usd` when the request omits one. */
export const DEFAULT_MAX_BUDGET_USD = process.env.CLAUDE_MAX_BUDGET_USD;

/** Default reasoning effort (low | medium | high | xhigh | max); a per-request value overrides it. */
export const DEFAULT_EFFORT = process.env.CLAUDE_EFFORT;
