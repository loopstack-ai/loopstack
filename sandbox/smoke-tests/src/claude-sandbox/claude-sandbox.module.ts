import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { HitlModule } from '@loopstack/hitl';
import { ClaudeAuthService } from './auth/claude-auth.service';
import { HostCredentialsReader } from './auth/host-credentials.reader';
import { BenchmarkJudgeService } from './benchmark/benchmark-judge.service';
import { BenchmarkReportService } from './benchmark/benchmark-report.service';
import { BenchmarkSandboxProbe } from './benchmark/benchmark-sandbox-probe.service';
import { ClaudeCliRunner } from './cli/claude-cli.runner';
import { ClaudeStreamParser } from './cli/claude-stream.parser';
import { BenchmarkScorecard } from './documents/benchmark-scorecard.document';
import { LocalSandboxService } from './sandbox/local-sandbox.service';
import { ClaudeCodeWorkflow } from './workflows/claude-code.workflow';
import { LoopstackBenchmarkWorkflow } from './workflows/loopstack-benchmark.workflow';

@Module({
  imports: [HitlModule, ClaudeModule],
  providers: [
    HostCredentialsReader,
    ClaudeAuthService,
    LocalSandboxService,
    ClaudeStreamParser,
    ClaudeCliRunner,
    BenchmarkSandboxProbe,
    BenchmarkJudgeService,
    BenchmarkReportService,
    BenchmarkScorecard,
    ClaudeCodeWorkflow,
    LoopstackBenchmarkWorkflow,
  ],
  exports: [ClaudeCodeWorkflow, LoopstackBenchmarkWorkflow],
})
export class ClaudeSandboxModule {}
