import { z } from 'zod';
import { BaseWorkflow, MarkdownDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { ToolTraceService } from './services/tool-trace.service';
import { SimulateWorkTool } from './tools/simulate-work.tool';

const TracingExampleArgsSchema = z.object({
  steps: z.number().min(1).max(10).default(3),
});

type TracingExampleArgs = z.infer<typeof TracingExampleArgsSchema>;

@Workflow({
  title: 'Observability - Tracing Interceptor Example',
  description:
    'Demonstrates a custom ToolInterceptor — @UseToolInterceptor() registers it app-wide, it measures every tool execution and stores trace entries in an injectable service. The workflow runs a few tool calls and renders the collected trace.',
  schema: TracingExampleArgsSchema,
})
export class TracingExampleWorkflow extends BaseWorkflow<TracingExampleArgs> {
  constructor(
    private readonly simulateWorkTool: SimulateWorkTool,
    private readonly traceStore: ToolTraceService,
  ) {
    super();
  }

  @Transition({ to: 'end' })
  async runAndTrace(_state: object, ctx: RunContext<TracingExampleArgs>) {
    for (let i = 1; i <= ctx.args.steps; i++) {
      await this.simulateWorkTool.call({ label: `step-${i}`, delayMs: i * 100 });
    }

    const entries = this.traceStore.forWorkflow(ctx.workflowId);

    await this.documentStore.save(MarkdownDocument, {
      markdown: [
        '## Tool Trace',
        '',
        'Collected by `TracingInterceptor` — it wraps every tool call in this app.',
        '',
        '| Tool | Duration | Status |',
        '| ---- | -------- | ------ |',
        ...entries.map((e) => `| \`${e.toolName}\` | ${e.durationMs}ms | ${e.success ? '✅ ok' : '❌ failed'} |`),
      ].join('\n'),
    });
  }
}
