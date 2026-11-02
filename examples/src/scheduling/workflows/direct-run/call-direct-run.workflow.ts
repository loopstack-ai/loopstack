import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { BaseWorkflow, MessageDocument, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { localBaseUrl } from '../../support/local-base-url';

const CallDirectRunArgsSchema = z.object({
  text: z.string().default('Start a workflow from code and read its result.').describe('Text to count.'),
});
type CallDirectRunArgs = z.infer<typeof CallDirectRunArgsSchema>;

@Workflow({
  title: 'Scheduling - Direct Run (HTTP)',
  description:
    'Runnable from Studio. Makes a real HTTP POST to /scheduling-examples/direct-run, which runs DirectRunWorkflow with WorkflowRunner.runSync and responds with its status and result. Demonstrates the plain WorkflowRunner call without curl.',
  schema: CallDirectRunArgsSchema,
})
export class CallDirectRunWorkflow extends BaseWorkflow<CallDirectRunArgs> {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  @Transition({ to: 'end' })
  async call(_state: Record<string, unknown>, ctx: RunContext<CallDirectRunArgs>) {
    const url = `${localBaseUrl(this.configService)}/scheduling-examples/direct-run`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ctx.args),
    });
    const data = (await res.json()) as { workflowId?: string; status?: string; result?: unknown };

    await this.documentStore.save(MessageDocument, {
      role: 'assistant',
      text: `POST ${url} → ${res.status}. DirectRunWorkflow ${data.workflowId ?? '(see response)'} ended ${data.status ?? '(unknown)'} with result ${JSON.stringify(data.result)}.`,
    });
    this.assignResult({ status: res.status, response: data });
  }
}
