import * as path from 'path';

export const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/workspace';
export const APP_ROOT = path.join(WORKSPACE_ROOT, 'app');

export const ALLOWED_ROOTS = [path.resolve(WORKSPACE_ROOT), '/tmp/'];

export function resolveSafePath(requestedPath: string): string {
  const resolved = path.resolve(WORKSPACE_ROOT, requestedPath);
  const isAllowed = ALLOWED_ROOTS.some((root) => resolved.startsWith(root));
  if (!isAllowed) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}
