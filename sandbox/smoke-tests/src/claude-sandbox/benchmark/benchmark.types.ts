import { ClaudeRunStats } from '../cli/claude-cli.types';
import { BenchmarkScorecardType } from '../documents/benchmark-scorecard.document';

export type ObjectiveSignals = BenchmarkScorecardType['objective'];
export type RetroContent = BenchmarkScorecardType['retro'];

/** Persisted state machine state for {@link LoopstackBenchmarkWorkflow}. */
export interface BenchmarkState {
  token?: string;
  verifier?: string;
  oauthState?: string;
  containerId?: string;
  agentUrl?: string;

  sessionId?: string;
  buildStartedAt?: number;
  retroStartedAt?: number;
  buildWallMs?: number;
  retroWallMs?: number;

  buildTicks?: number;
  retroTicks?: number;
  buildFinished?: boolean;
  retroFinished?: boolean;

  buildStats?: ClaudeRunStats;
  retroStats?: ClaudeRunStats;
  buildSummary?: string;

  objective?: ObjectiveSignals;
  retro?: RetroContent;
}
