import { describe, expect, it } from 'vitest';
import { GIT_EXEC_TIMEOUT_MS, safeDir, safeRef, shellQuote } from '../git-exec.js';

describe('safeDir', () => {
  it('takes a path inside the workspace, and the root when there is none', () => {
    expect(safeDir('loopstack')).toBe('loopstack');
    expect(safeDir('repos/hello')).toBe('repos/hello');
    expect(safeDir()).toBe('.');
    expect(safeDir('')).toBe('.');
  });

  // `dir` names a repository inside the workspace on every tool in this package, so it means that here too.
  it('refuses an absolute path and a way out of the workspace', () => {
    expect(() => safeDir('/etc')).toThrow('relative to the workspace root');
    expect(() => safeDir('../elsewhere')).toThrow('stay inside the workspace root');
    expect(() => safeDir('repos/../../elsewhere')).toThrow('stay inside the workspace root');
  });

  it('does not refuse a name that merely contains dots', () => {
    expect(safeDir('repos/my..repo')).toBe('repos/my..repo');
    expect(safeDir('.config')).toBe('.config');
  });
});

describe('safeRef', () => {
  it('takes a ref and returns it', () => {
    expect(safeRef('origin/main')).toBe('origin/main');
    expect(safeRef('v1.2.3')).toBe('v1.2.3');
    expect(safeRef('abc1234')).toBe('abc1234');
  });

  // A ref is the only part of these commands that comes from outside, so it is checked rather than quoted.
  it('refuses anything a shell or git would read as more than a ref', () => {
    expect(() => safeRef('origin/main; rm -rf /')).toThrow('not a usable git ref');
    expect(() => safeRef('--upload-pack=sh')).toThrow('not a usable git ref');
    expect(() => safeRef('origin/main..HEAD')).toThrow('not a usable git ref');
    expect(() => safeRef('$(id)')).toThrow('not a usable git ref');
    expect(() => safeRef('')).toThrow('not a usable git ref');
  });
});

describe('shellQuote', () => {
  it('survives a message with quotes, newlines and a trailer', () => {
    expect(shellQuote("it's fine\n\nCloses #1\n")).toBe(`'it'\\''s fine\n\nCloses #1\n'`);
  });
});

describe('GIT_EXEC_TIMEOUT_MS', () => {
  it('is far above the exec route’s default, which a tree walk runs past', () => {
    expect(GIT_EXEC_TIMEOUT_MS).toBeGreaterThan(30_000 * 10);
  });
});
