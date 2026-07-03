import pc from 'picocolors';
import { LoopstackApiError } from '@loopstack/client';

/** Exit codes shared across all commands (documented in the README). */
export const ExitCode = {
  Success: 0,
  RunFailed: 1,
  ConnectionOrConfig: 2,
  NeedsInput: 3,
} as const;

export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode: number = ExitCode.ConnectionOrConfig,
  ) {
    super(message);
  }
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && /fetch failed/i.test(error.message);
}

/** Prints a friendly message to stderr and exits with the matching code. */
export function handleError(error: unknown, url?: string): never {
  if (error instanceof CliError) {
    console.error(pc.red(`✖ ${error.message}`));
    process.exit(error.exitCode);
  }
  if (error instanceof LoopstackApiError) {
    const hint = error.status === 401 || error.status === 403 ? ' — check your token (loopstack login)' : '';
    console.error(pc.red(`✖ API error ${error.status}: ${error.message}${hint}`));
    process.exit(ExitCode.ConnectionOrConfig);
  }
  if (isNetworkError(error)) {
    console.error(pc.red(`✖ Cannot reach the Loopstack backend${url ? ` at ${url}` : ''} — is it running?`));
    process.exit(ExitCode.ConnectionOrConfig);
  }
  console.error(pc.red(`✖ ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`));
  process.exit(ExitCode.ConnectionOrConfig);
}
