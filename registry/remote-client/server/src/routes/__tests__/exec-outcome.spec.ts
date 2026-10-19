import { describe, expect, it } from 'vitest';
import { TIMEOUT_EXIT_CODE, execOutcome } from '../exec-outcome.js';

/**
 * The host reads nothing but `exitCode`, `stdout` and `stderr`, and reports a non-zero exit by quoting the
 * output. A killed command has no output of its own, so whatever this does not say, nobody says.
 */
describe('exec outcome', () => {
  it('passes a successful command through', () => {
    expect(execOutcome(null, 'out', '', 1000)).toEqual({ stdout: 'out', stderr: '', exitCode: 0 });
  });

  it('keeps a real failure’s exit code and output', () => {
    expect(execOutcome({ code: 128 }, '', 'fatal: not a git repository', 1000)).toEqual({
      stdout: '',
      stderr: 'fatal: not a git repository',
      exitCode: 128,
    });
  });

  it('reports a kill as a timeout, with the limit it hit', () => {
    // `exec` kills with SIGTERM on timeout: `code` is unset and both streams are empty. Reported as exit 1
    // with no output — which is what happened — the caller can only say "`git status` failed:" and stop.
    const outcome = execOutcome({ killed: true, signal: 'SIGTERM' }, '', '', 30_000);
    expect(outcome.exitCode).toBe(TIMEOUT_EXIT_CODE);
    expect(outcome.stderr).toContain('timed out after 30000ms');
    expect(outcome.stderr).toContain('SIGTERM');
    // The consequence is the part that is not obvious from the exit code: a git killed mid-write leaves
    // `.git/index.lock`, and the next command fails for a reason that looks unrelated.
    expect(outcome.stderr).toContain('unfinished');
  });

  it('keeps what a killed command had already written', () => {
    const outcome = execOutcome({ killed: true, signal: 'SIGTERM' }, 'partial', 'warning: slow', 5_000);
    expect(outcome.stdout).toBe('partial');
    expect(outcome.stderr).toContain('warning: slow');
    expect(outcome.stderr).toContain('timed out');
  });

  it('does not take a non-numeric error code for an exit code', () => {
    // `error.code` is a string for a spawn failure (`ENOENT`); the host compares exitCode to 0.
    expect(execOutcome({ code: 'ENOENT' }, '', 'not found', 1000).exitCode).toBe(1);
    expect(execOutcome({ code: null }, '', '', 1000).exitCode).toBe(1);
  });
});
