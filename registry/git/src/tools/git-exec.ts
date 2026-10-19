import { z } from 'zod';
import type { ToolCallOptions } from '@loopstack/common';
import type { EnvironmentService, ExecResponse, RemoteClient } from '@loopstack/remote-client';

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

/**
 * Checks the repository directory before it becomes a working directory.
 *
 * `dir` means the same thing on every tool in this package — a repository inside the workspace — and on the
 * route-backed tools the server validates it. The operations below run their commands through `/exec`, which
 * takes a directory as it is given, so the same rule is applied here. This is not a sandbox: `/exec` runs a
 * shell command, and the container is the boundary. It keeps one argument meaning one thing.
 */
export function safeDir(dir?: string): string {
  if (!dir) return '.';
  if (dir.startsWith('/')) throw new Error('dir must be relative to the workspace root.');
  if (dir.split('/').includes('..')) throw new Error('dir must stay inside the workspace root.');
  return dir;
}

/** Runs a git command in `dir` of the workspace, with the long budget. */
export function gitExec(remote: RemoteClient, agentUrl: string, command: string, dir?: string): Promise<ExecResponse> {
  return remote.executeCommand(agentUrl, command, safeDir(dir), GIT_EXEC_TIMEOUT_MS);
}

/** Runs a git command and returns its stdout, trimmed, or throws with git's own output. */
export async function gitRun(remote: RemoteClient, agentUrl: string, command: string, dir?: string): Promise<string> {
  const result = await gitExec(remote, agentUrl, command, dir);
  if (result.exitCode !== 0) {
    throw new Error(`\`${command.slice(0, 80)}\` failed:\n${(result.stderr || result.stdout).slice(-2000)}`);
  }
  return result.stdout.trim();
}

/**
 * The config the composed operations accept: which agent to run on.
 *
 * A tool resolves its agent from the workspace's environments, which is right when the workspace *is* the
 * container. A workflow that provisions a container for one piece of work — a landing, a publish — holds
 * that container's URL in its own state, and no environment row points at it; naming it here is how such a
 * workflow uses these tools. It is config rather than an argument because the author knows the container and
 * a model must not be the one to choose it.
 *
 * @public
 */
export const GitTargetConfigSchema = z.object({
  agentUrl: z.string().optional(),
});

/**
 * Config type for the composed operations — see {@link GitTargetConfigSchema}.
 *
 * @public
 */
export type GitTargetConfig = z.infer<typeof GitTargetConfigSchema>;

/** The agent this call runs on: the one it names, or the one the workspace's environment resolves to. */
export function targetAgentUrl(env: EnvironmentService, options?: ToolCallOptions<GitTargetConfig>): Promise<string> {
  const named = options?.config?.agentUrl;
  return named ? Promise.resolve(named) : env.getAgentUrl();
}
