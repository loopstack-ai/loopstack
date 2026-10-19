import { describe, expect, it } from 'vitest';
import { resolveRepoDir } from '../git-paths.js';

/**
 * The `dir` a git route accepts names a repo inside the mounted checkout, and it comes from the host —
 * but it is still validated, because "it is only ever called by our own code" is the assumption that makes
 * a path-traversal bug survive. The root is passed explicitly so the test does not depend on the server's
 * environment.
 */
const WORKSPACE_ROOT = '/workspace';
const resolve = (dir?: string) => resolveRepoDir(dir, WORKSPACE_ROOT);

describe('git route — repo dir resolution', () => {
  it('defaults to the workspace root when no dir is given', () => {
    expect(resolve()).toBe(WORKSPACE_ROOT);
    expect(resolve('')).toBe(WORKSPACE_ROOT);
  });

  it('resolves a nested repo dir, which is the whole point of the parameter', () => {
    expect(resolve('loopstack')).toBe('/workspace/loopstack');
    expect(resolve('loopstack/sandbox/loopstack-engineer')).toBe('/workspace/loopstack/sandbox/loopstack-engineer');
  });

  it('rejects an absolute path', () => {
    expect(() => resolve('/etc')).toThrow(/relative/);
  });

  it('rejects traversal out of the workspace, however it is spelled', () => {
    expect(() => resolve('..')).toThrow(/inside/);
    expect(() => resolve('../secrets')).toThrow(/inside/);
    expect(() => resolve('loopstack/../..')).toThrow(/inside/);
    expect(() => resolve('loopstack/../../elsewhere')).toThrow(/inside/);
  });

  it('does not mistake a sibling with a shared prefix for a child', () => {
    // `/workspace-other` starts with `/workspace`, so a naive startsWith check would let it through.
    expect(() => resolve('../workspace-other')).toThrow(/inside/);
  });
});
