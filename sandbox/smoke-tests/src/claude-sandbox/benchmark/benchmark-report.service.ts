import { Injectable } from '@nestjs/common';
import { ClaudeRunStats } from '../cli/claude-cli.types';
import { BenchmarkScorecardType } from '../documents/benchmark-scorecard.document';
import { RetroContent } from './benchmark.types';

/** Pure post-processing: parsing the retrospective, aggregating stats, and rendering the summary. */
@Injectable()
export class BenchmarkReportService {
  emptyRetro(): RetroContent {
    return { wentWell: [], wentBadly: [], improvements: [] };
  }

  /** Tolerant parse of a retrospective JSON object embedded anywhere in `raw`. */
  parseRetro(raw: string): RetroContent | null {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const j = JSON.parse(match[0]) as Partial<RetroContent>;
      return {
        wentWell: Array.isArray(j.wentWell) ? j.wentWell : [],
        wentBadly: Array.isArray(j.wentBadly) ? j.wentBadly : [],
        improvements: Array.isArray(j.improvements) ? j.improvements : [],
      };
    } catch {
      return null;
    }
  }

  aggregateStats(
    build: ClaudeRunStats | undefined,
    retro: ClaudeRunStats | undefined,
    buildWallMs: number,
    retroWallMs: number,
  ): BenchmarkScorecardType['stats'] {
    const inputTokens = (build?.inputTokens ?? 0) + (retro?.inputTokens ?? 0);
    const outputTokens = (build?.outputTokens ?? 0) + (retro?.outputTokens ?? 0);
    return {
      totalTokens: inputTokens + outputTokens,
      inputTokens,
      outputTokens,
      cacheTokens: (build?.cacheTokens ?? 0) + (retro?.cacheTokens ?? 0),
      totalCostUsd: (build?.costUsd ?? 0) + (retro?.costUsd ?? 0),
      numTurns: (build?.numTurns ?? 0) + (retro?.numTurns ?? 0),
      buildWallMs,
      retroWallMs,
      totalWallMs: buildWallMs + retroWallMs,
    };
  }

  summaryMarkdown(s: BenchmarkScorecardType): string {
    const improvements = s.retro.improvements.map((i) => `- _(${i.kind})_ ${i.suggestion}`).join('\n') || '_none_';
    const minutes = (s.stats.totalWallMs / 60000).toFixed(1);
    return [
      `## Loopstack Self-Benchmark — **${s.score.overall}/100**`,
      '',
      `**Build:** ${s.objective.buildPassed ? '✅' : '❌'}  ·  **Tests:** ${s.objective.testsPassed ? '✅' : '❌'}  ·  **Model:** ${s.model}`,
      '',
      '| Dimension | Score |',
      '|---|---|',
      `| Onboarding | ${s.score.onboarding}/20 |`,
      `| DX clarity | ${s.score.dxClarity}/20 |`,
      `| Documentation | ${s.score.documentation}/20 |`,
      `| Error debuggability | ${s.score.errorDebuggability}/20 |`,
      `| Task completion | ${s.score.taskCompletion}/20 |`,
      '',
      `**Stats:** ${s.stats.totalTokens.toLocaleString()} tokens · $${s.stats.totalCostUsd.toFixed(4)} · ${s.stats.numTurns} turns · ${minutes} min`,
      '',
      `**Rationale:** ${s.scoreRationale}`,
      '',
      `### Improvement ideas\n${improvements}`,
    ].join('\n');
  }
}
