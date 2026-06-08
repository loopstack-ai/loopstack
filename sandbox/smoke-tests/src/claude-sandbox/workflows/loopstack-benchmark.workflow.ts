import { z } from 'zod';
import {
  BaseWorkflow,
  CallbackSchema,
  Guard,
  LinkDocument,
  MessageDocument,
  QueueResult,
  Transition,
  Workflow,
} from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { AskUserWorkflow } from '@loopstack/hitl';
import { ClaudeAuthService } from '../auth/claude-auth.service';
import { BenchmarkJudgeService } from '../benchmark/benchmark-judge.service';
import { BenchmarkReportService } from '../benchmark/benchmark-report.service';
import { BenchmarkSandboxProbe } from '../benchmark/benchmark-sandbox-probe.service';
import {
  DEFAULT_MODEL,
  DEFAULT_TASK,
  MAX_BUILD_TICKS,
  MAX_RETRO_TICKS,
  POLL_MS,
} from '../benchmark/benchmark.constants';
import { buildPrompt, retroPrompt } from '../benchmark/benchmark.prompts';
import type { BenchmarkState } from '../benchmark/benchmark.types';
import { ClaudeCliRunner } from '../cli/claude-cli.runner';
import { BenchmarkScorecard, BenchmarkScorecardType } from '../documents/benchmark-scorecard.document';
import { LocalSandboxService } from '../sandbox/local-sandbox.service';

const CodeCallbackSchema = CallbackSchema.extend({
  data: z.object({ answer: z.string() }),
});
type CodeCallback = z.infer<typeof CodeCallbackSchema>;

const LoopstackBenchmarkArgsSchema = z
  .object({
    task: z.string().default(DEFAULT_TASK).describe('The automation idea Claude should build with Loopstack.'),
    model: z
      .string()
      .default(DEFAULT_MODEL)
      .describe('Model Claude Code uses inside the sandbox. Keep constant across releases for a comparable KPI.'),
    judgeModel: z.string().default(DEFAULT_MODEL).describe('Model used by the independent scoring judge.'),
  })
  .strict();

type LoopstackBenchmarkArgs = z.infer<typeof LoopstackBenchmarkArgsSchema>;

/**
 * Orchestrates a self-benchmark run: build → poll/stream → verify → retrospective → judge → persist.
 * All heavy lifting is delegated to dedicated services; this class only wires the state machine.
 */
@Workflow({
  title: 'Loopstack Self-Benchmark',
  description:
    'Spins up a blank sandbox, has Claude Code build a Loopstack automation from scratch, fix and test it, ' +
    'then write a retrospective. Captures objective build/test signals plus token/cost/time stats, and an ' +
    'independent LLM judge assigns an overall framework-quality score (0–100) for tracking across releases.',
  schema: LoopstackBenchmarkArgsSchema,
})
export class LoopstackBenchmarkWorkflow extends BaseWorkflow<LoopstackBenchmarkArgs, BenchmarkState> {
  constructor(
    private readonly sandbox: LocalSandboxService,
    private readonly auth: ClaudeAuthService,
    private readonly askUser: AskUserWorkflow,
    private readonly cli: ClaudeCliRunner,
    private readonly probe: BenchmarkSandboxProbe,
    private readonly judge: BenchmarkJudgeService,
    private readonly report: BenchmarkReportService,
  ) {
    super();
  }

  @Transition({ to: 'auth' })
  async start(state: BenchmarkState, ctx: LoopstackContext): Promise<BenchmarkState> {
    const token = await this.auth.getValidToken(ctx.userId);
    return { ...state, token };
  }

  hasToken(state: BenchmarkState): boolean {
    return !!state.token;
  }

  @Transition({ from: 'auth', to: 'ready', priority: 10 })
  @Guard('hasToken')
  alreadyAuthed(state: BenchmarkState): Promise<BenchmarkState> {
    return Promise.resolve(state);
  }

  @Transition({ from: 'auth', to: 'awaiting_login' })
  async needLogin(state: BenchmarkState): Promise<BenchmarkState> {
    const { authUrl, verifier, state: oauthState } = this.auth.begin();

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content:
        'A Claude subscription login is required.\n\n' +
        `1. Open this link and sign in: [Authorize Claude Code](${authUrl})\n` +
        '2. Copy the code shown on the callback page (format `code#state`).\n' +
        '3. Paste it into the input below.',
    });

    const result: QueueResult = await this.askUser.run(
      { question: 'Paste the authorization code from the Claude callback page:' },
      { callback: { transition: 'codeReceived' } },
    );

    await this.documentStore.save(
      LinkDocument,
      {
        status: 'pending',
        label: 'Waiting for authorization code…',
        workflowId: result.workflowId,
        embed: true,
        expanded: true,
      },
      { id: `link_${result.workflowId}` },
    );

    return { ...state, verifier, oauthState };
  }

  @Transition({ from: 'awaiting_login', to: 'ready', wait: true, schema: CodeCallbackSchema })
  async codeReceived(state: BenchmarkState, payload: CodeCallback, ctx: LoopstackContext): Promise<BenchmarkState> {
    const token = await this.auth.completeLogin(ctx.userId, payload.data.answer, state.verifier!, state.oauthState!);

    await this.documentStore.save(
      LinkDocument,
      { status: 'success', label: 'Authorization code received', workflowId: payload.workflowId },
      { id: `link_${payload.workflowId}` },
    );

    return { ...state, token };
  }

  @Transition({ from: 'ready', to: 'building' })
  async build(state: BenchmarkState, ctx: LoopstackContext): Promise<BenchmarkState> {
    const { task } = ctx.args as LoopstackBenchmarkArgs;
    const { containerId, agentUrl } = await this.sandbox.provision(ctx.workspaceId, state.token);

    await this.cli.launch(agentUrl, buildPrompt(task));

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: `Sandbox ready at \`${agentUrl}\`. Claude Code is building:\n\n> ${task}`,
    });

    return { ...state, containerId, agentUrl, buildStartedAt: Date.now() };
  }

  // Self-looping poll: each tick commits a fresh transcript snapshot, so the Studio UI streams
  // Claude's output live. (A throwing retry would roll back the snapshot — see workflow-processor.)
  notBuildFinished(state: BenchmarkState): boolean {
    return state.buildFinished !== true;
  }

  isBuildFinished(state: BenchmarkState): boolean {
    return state.buildFinished === true;
  }

  @Transition({ from: 'building', to: 'building' })
  @Guard('notBuildFinished')
  async streamBuild(state: BenchmarkState): Promise<BenchmarkState> {
    await this.sleep(POLL_MS);
    await this.renderProgress(state.agentUrl!, 'claude-build-log', 'Claude Code — building');
    const buildTicks = (state.buildTicks ?? 0) + 1;
    const buildFinished = (await this.cli.isFinished(state.agentUrl!)) || buildTicks >= MAX_BUILD_TICKS;
    return { ...state, buildTicks, buildFinished };
  }

  @Transition({ from: 'building', to: 'buildDone', priority: 10 })
  @Guard('isBuildFinished')
  buildReady(state: BenchmarkState): Promise<BenchmarkState> {
    return Promise.resolve(state);
  }

  @Transition({ from: 'buildDone', to: 'retroRunning' })
  async collectBuild(state: BenchmarkState): Promise<BenchmarkState> {
    const agentUrl = state.agentUrl!;
    const buildStats = await this.cli.readStats(agentUrl);
    const buildWallMs = Date.now() - (state.buildStartedAt ?? Date.now());
    const objective = await this.probe.collectObjectiveSignals(agentUrl);

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content:
        `**Build phase done.** build ${objective.buildPassed ? '✅' : '❌'} · tests ` +
        `${objective.testsPassed ? '✅' : '❌'} · ${objective.filesChanged} source files · ` +
        `${buildStats.numTurns} turns · $${buildStats.costUsd.toFixed(4)}\n\nWriting retrospective…`,
    });

    // Kick off the retro run, resuming the build session so Claude keeps full context.
    await this.cli.launch(agentUrl, retroPrompt(), { resumeSessionId: buildStats.sessionId });

    return {
      ...state,
      buildStats,
      buildWallMs,
      buildSummary: buildStats.result,
      sessionId: buildStats.sessionId,
      objective,
      retroStartedAt: Date.now(),
    };
  }

  notRetroFinished(state: BenchmarkState): boolean {
    return state.retroFinished !== true;
  }

  isRetroFinished(state: BenchmarkState): boolean {
    return state.retroFinished === true;
  }

  @Transition({ from: 'retroRunning', to: 'retroRunning' })
  @Guard('notRetroFinished')
  async streamRetro(state: BenchmarkState): Promise<BenchmarkState> {
    await this.sleep(POLL_MS);
    await this.renderProgress(state.agentUrl!, 'claude-retro-log', 'Claude Code — writing retrospective');
    const retroTicks = (state.retroTicks ?? 0) + 1;
    const retroFinished = (await this.cli.isFinished(state.agentUrl!)) || retroTicks >= MAX_RETRO_TICKS;
    return { ...state, retroTicks, retroFinished };
  }

  @Transition({ from: 'retroRunning', to: 'retroDone', priority: 10 })
  @Guard('isRetroFinished')
  retroReady(state: BenchmarkState): Promise<BenchmarkState> {
    return Promise.resolve(state);
  }

  @Transition({ from: 'retroDone', to: 'judging' })
  async collectRetro(state: BenchmarkState): Promise<BenchmarkState> {
    const agentUrl = state.agentUrl!;
    const retroStats = await this.cli.readStats(agentUrl);
    const retroWallMs = Date.now() - (state.retroStartedAt ?? Date.now());

    const raw = await this.probe.readRetroJson(agentUrl);
    const retro = this.report.parseRetro(raw) ?? this.report.parseRetro(retroStats.result) ?? this.report.emptyRetro();

    return { ...state, retroStats, retroWallMs, retro };
  }

  @Transition({ from: 'judging', to: 'cleanup' })
  async persist(state: BenchmarkState, ctx: LoopstackContext): Promise<BenchmarkState> {
    const { task, model, judgeModel } = ctx.args as LoopstackBenchmarkArgs;
    const objective = state.objective ?? { buildPassed: false, testsPassed: false, filesChanged: 0 };
    const retro = state.retro ?? this.report.emptyRetro();

    const verdict = await this.judge.score({
      task,
      objective,
      retro,
      buildSummary: state.buildSummary ?? '',
      model: judgeModel,
    });
    const stats = this.report.aggregateStats(
      state.buildStats,
      state.retroStats,
      state.buildWallMs ?? 0,
      state.retroWallMs ?? 0,
    );

    const scorecard: BenchmarkScorecardType = {
      task,
      model,
      objective,
      stats,
      retro,
      score: verdict.score,
      scoreRationale: verdict.rationale,
    };

    await this.documentStore.save(BenchmarkScorecard, scorecard, { id: 'scorecard' });
    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      content: this.report.summaryMarkdown(scorecard),
    });

    return state;
  }

  @Transition({ from: 'cleanup', to: 'end' })
  async cleanup(state: BenchmarkState): Promise<unknown> {
    if (state.containerId) {
      await this.sandbox.teardown(state.containerId);
    }
    return {};
  }

  /** Reads the live transcript and commits it to a stable (overwriting) document. */
  private async renderProgress(agentUrl: string, docId: string, heading: string): Promise<void> {
    const md = await this.cli.readTranscript(agentUrl, heading);
    if (md) {
      await this.documentStore.save(MessageDocument, { role: 'assistant', content: md }, { id: docId });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
