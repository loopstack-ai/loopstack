import { z } from 'zod';
import { Document } from '@loopstack/common';

const ImprovementSchema = z.object({
  kind: z.enum(['docs', 'code', 'dx']),
  suggestion: z.string(),
});

export const BenchmarkScorecardSchema = z
  .object({
    task: z.string(),
    model: z.string(),

    // Objective, non-hallucinatable signals captured from the container.
    objective: z.object({
      buildPassed: z.boolean(),
      testsPassed: z.boolean(),
      filesChanged: z.number(),
    }),

    // Aggregated stats across the build + retro Claude Code runs.
    stats: z.object({
      totalTokens: z.number(),
      inputTokens: z.number(),
      outputTokens: z.number(),
      cacheTokens: z.number(),
      totalCostUsd: z.number(),
      numTurns: z.number(),
      buildWallMs: z.number(),
      retroWallMs: z.number(),
      totalWallMs: z.number(),
    }),

    // Claude's self-written retrospective.
    retro: z.object({
      wentWell: z.array(z.string()),
      wentBadly: z.array(z.string()),
      improvements: z.array(ImprovementSchema),
    }),

    // Independent LLM judge, fixed rubric (each dimension 0–20, overall 0–100).
    score: z.object({
      onboarding: z.number(),
      dxClarity: z.number(),
      documentation: z.number(),
      errorDebuggability: z.number(),
      taskCompletion: z.number(),
      overall: z.number(),
    }),
    scoreRationale: z.string(),
  })
  .strict();

export type BenchmarkScorecardType = z.infer<typeof BenchmarkScorecardSchema>;

@Document({
  schema: BenchmarkScorecardSchema,
  widget: __dirname + '/benchmark-scorecard.yaml',
})
export class BenchmarkScorecard {
  declare task: string;
  declare model: string;
  declare objective: BenchmarkScorecardType['objective'];
  declare stats: BenchmarkScorecardType['stats'];
  declare retro: BenchmarkScorecardType['retro'];
  declare score: BenchmarkScorecardType['score'];
  declare scoreRationale: string;
}
