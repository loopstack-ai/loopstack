import { Injectable } from '@nestjs/common';
import { toJSONSchema, z } from 'zod';
import { LlmGenerateObjectTool } from '@loopstack/llm-provider-module';
import type { LlmGenerateObjectResult } from '@loopstack/llm-provider-module';
import { BenchmarkScorecardType } from '../documents/benchmark-scorecard.document';
import { ObjectiveSignals, RetroContent } from './benchmark.types';

// Fixed rubric — five dimensions, each 0–20. Kept stable across releases so scores are comparable.
const JudgeSchema = z
  .object({
    onboarding: z.number().min(0).max(20).describe('Scaffolding / install / peer-dependency friction.'),
    dxClarity: z.number().min(0).max(20).describe('Clarity and ergonomics of the Loopstack API.'),
    documentation: z.number().min(0).max(20).describe('Adequacy of available documentation.'),
    errorDebuggability: z.number().min(0).max(20).describe('Quality of error messages and debuggability.'),
    taskCompletion: z.number().min(0).max(20).describe('Did the build and tests actually pass and meet the task?'),
    rationale: z.string().describe('Short justification referencing concrete evidence.'),
  })
  .strict();
type JudgeResult = z.infer<typeof JudgeSchema>;

export interface JudgeInput {
  task: string;
  objective: ObjectiveSignals;
  retro: RetroContent;
  buildSummary: string;
  model: string;
}

export interface JudgeVerdict {
  score: BenchmarkScorecardType['score'];
  rationale: string;
}

/** Independent LLM judge that scores framework quality from one benchmark run, against a fixed rubric. */
@Injectable()
export class BenchmarkJudgeService {
  constructor(private readonly llm: LlmGenerateObjectTool) {}

  async score(input: JudgeInput): Promise<JudgeVerdict> {
    const system = [
      'You are an objective evaluator of the Loopstack TypeScript framework based on a single benchmark run.',
      'Score five dimensions, each 0–20: onboarding (scaffolding/install/peer-deps), dxClarity (API ergonomics),',
      'documentation (adequacy), errorDebuggability (error message quality), and taskCompletion.',
      'For taskCompletion, weight the OBJECTIVE build/test signals heavily — do not reward unverified claims.',
      'Higher is better. Be calibrated and consistent so scores are comparable across runs.',
    ].join('\n');

    const prompt = [
      `TASK:\n${input.task}`,
      '',
      `OBJECTIVE SIGNALS: buildPassed=${input.objective.buildPassed}, testsPassed=${input.objective.testsPassed}, sourceFiles=${input.objective.filesChanged}`,
      '',
      `CLAUDE BUILD SUMMARY:\n${input.buildSummary.slice(0, 6000)}`,
      '',
      `RETROSPECTIVE:\n${JSON.stringify(input.retro, null, 2)}`,
    ].join('\n');

    const result = await this.llm.call(
      { prompt, outputSchema: toJSONSchema(JudgeSchema) },
      { config: { provider: 'claude', model: input.model, system } },
    );

    const verdict = (result.data as LlmGenerateObjectResult).data as JudgeResult;
    const dims = {
      onboarding: this.clamp(verdict.onboarding),
      dxClarity: this.clamp(verdict.dxClarity),
      documentation: this.clamp(verdict.documentation),
      errorDebuggability: this.clamp(verdict.errorDebuggability),
      taskCompletion: this.clamp(verdict.taskCompletion),
    };
    const overall =
      dims.onboarding + dims.dxClarity + dims.documentation + dims.errorDebuggability + dims.taskCompletion;

    return { score: { ...dims, overall }, rationale: verdict.rationale };
  }

  private clamp(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(20, Math.round(n)));
  }
}
