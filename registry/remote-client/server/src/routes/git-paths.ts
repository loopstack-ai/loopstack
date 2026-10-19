import * as path from 'path';
import { WORKSPACE_ROOT } from '../config.js';

/**
 * Resolve a caller-supplied repo directory against the workspace root.
 *
 * A checkout holds several repos in one mounted tree, so git commands have to be addressable per repo
 * rather than always running at the root. The path is validated rather than trusted: it must stay inside
 * WORKSPACE_ROOT, which rules out absolute paths, `..` traversal and symlink-ish trickery in the string.
 * Side-effect free, so the route module's import-time work (the CA bundle) stays out of tests.
 */
export function resolveRepoDir(dir?: string, root: string = WORKSPACE_ROOT): string {
  if (!dir) return root;
  if (path.isAbsolute(dir)) throw new Error('dir must be relative to the workspace root');
  const resolved = path.resolve(root, dir);
  const base = path.resolve(root);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) {
    throw new Error('dir must stay inside the workspace root');
  }
  return resolved;
}

export function isValidRef(name: string): boolean {
  return /^[a-zA-Z0-9._\-/]+$/.test(name) && !name.includes('..');
}

export function quotePath(p: string): string {
  return `"${p.replace(/"/g, '\\"')}"`;
}
