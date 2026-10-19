import type { ExecResponse, RemoteClient } from '@loopstack/remote-client';

/**
 * How long a git command that walks the tree is allowed to take.
 *
 * The remote server's blocking `POST /exec` kills a command after 30 seconds unless the caller says
 * otherwise. That is right for the short commands it was written for and wrong for git: a workspace is a
 * bind mount from the host, and a rebase, a squash or a status over a monorepo through it regularly takes
 * longer. The tools that run several git commands in one operation therefore name their own budget.
 */
export const GIT_EXEC_TIMEOUT_MS = 600_000;

/** A ref name safe to put in a command: no spaces, no option-looking leading dash, no `..` escape. */
const SAFE_REF = /^(?!-)[A-Za-z0-9._/-]+$/;

/**
 * Checks a caller-supplied ref before it goes into a command, and returns it.
 *
 * The operations below are sequences of git commands rather than single routes, so they are assembled as
 * shell strings. A ref is the only part of them that comes from outside, which is why it is validated here
 * instead of quoted and hoped for.
 */
export function safeRef(ref: string): string {
  if (!SAFE_REF.test(ref) || ref.includes('..')) {
    throw new Error(`\`${ref}\` is not a usable git ref.`);
  }
  return ref;
}

/** Single-quotes a string for the shell, so a commit message can carry anything. */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Runs a git command in `dir` of the workspace, with the long budget. */
export function gitExec(remote: RemoteClient, agentUrl: string, command: string, dir?: string): Promise<ExecResponse> {
  return remote.executeCommand(agentUrl, command, dir || '.', GIT_EXEC_TIMEOUT_MS);
}

/** Runs a git command and returns its stdout, trimmed, or throws with git's own output. */
export async function gitRun(remote: RemoteClient, agentUrl: string, command: string, dir?: string): Promise<string> {
  const result = await gitExec(remote, agentUrl, command, dir);
  if (result.exitCode !== 0) {
    throw new Error(`\`${command.slice(0, 80)}\` failed:\n${(result.stderr || result.stdout).slice(-2000)}`);
  }
  return result.stdout.trim();
}
