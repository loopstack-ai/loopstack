import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';
import { SCHEDULING_EXAMPLES_APP } from '../../scheduling-examples.constants';
import { RunUserResolver } from '../../support/run-user.resolver';
import { BatchTriggerWorkflow } from './batch-trigger.workflow';

interface NewsletterBody {
  recipients?: string[];
}

const DEFAULT_SUBSCRIBERS = ['ada@example.com', 'grace@example.com', 'linus@example.com'];

/** Batch primitive: fan out one workflow run per recipient with Promise.all. */
@Controller('webhooks/scheduling-examples')
export class BatchTriggerController {
  constructor(
    private readonly workflowRunner: WorkflowRunner,
    private readonly runUser: RunUserResolver,
  ) {}

  @Public()
  @Post('newsletter')
  async sendNewsletter(@Body() body: NewsletterBody) {
    const userId = await this.runUser.resolve();
    if (!userId) {
      return { ok: false, reason: 'No local user yet — open Studio once.' };
    }

    const recipients = body?.recipients?.length ? body.recipients : DEFAULT_SUBSCRIBERS;
    const runs = await Promise.all(
      recipients.map((recipient) =>
        this.workflowRunner.run(BatchTriggerWorkflow, { recipient }, { appName: SCHEDULING_EXAMPLES_APP, userId }),
      ),
    );

    return { ok: true, launched: runs.length, workflowIds: runs.map((r) => r.workflowId) };
  }
}
