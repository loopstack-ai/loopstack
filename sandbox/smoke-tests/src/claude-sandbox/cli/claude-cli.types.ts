/** Normalised statistics extracted from a single `claude -p` run. */
export interface ClaudeRunStats {
  sessionId?: string;
  result: string;
  isError: boolean;
  numTurns: number;
  durationMs: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
}
