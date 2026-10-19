/**
 * What a timed-out command exits with — the shell's own convention for it, and what the host's
 * `RemoteClient.streamCommand` already reports for the streamed route.
 */
export const TIMEOUT_EXIT_CODE = 124;

/** The parts of `child_process.exec`'s error the outcome depends on. */
export interface ExecError {
  code?: number | string | null;
  killed?: boolean;
  signal?: NodeJS.Signals | string | null;
}

export interface ExecOutcome {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Turn `child_process.exec`'s callback arguments into the response the host reads.
 *
 * The case worth naming is the timeout. `exec` kills the command with SIGTERM, which leaves `error.code`
 * unset and both streams empty — so a killed command used to come back as exit 1 with nothing said, which
 * the caller can only report as "`<command>` failed:" followed by a blank line. Worse, a git killed mid-write
 * leaves `.git/index.lock` behind, so the *next* command fails for a reason that has nothing to do with it;
 * the two together made a timeout read as a mysterious lock conflict.
 *
 * So a kill is reported as {@link TIMEOUT_EXIT_CODE} and says so in `stderr`, which is where the caller looks
 * for something to put in its error message.
 */
export function execOutcome(
  error: ExecError | null | undefined,
  stdout: string | undefined,
  stderr: string | undefined,
  timeoutMs: number,
): ExecOutcome {
  const out = stdout || '';
  const err = stderr || '';
  if (!error) return { stdout: out, stderr: err, exitCode: 0 };

  // `killed` is set when the timeout fired — this server sends no other signal.
  if (error.killed) {
    const note =
      `timed out after ${timeoutMs}ms and was killed (${error.signal ?? 'SIGTERM'}). ` +
      'Whatever it was writing was left unfinished.';
    return { stdout: out, stderr: err ? `${err}\n${note}` : note, exitCode: TIMEOUT_EXIT_CODE };
  }
  return { stdout: out, stderr: err, exitCode: typeof error.code === 'number' ? error.code : 1 };
}
