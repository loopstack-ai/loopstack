import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { Public } from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';
import { SCHEDULING_EXAMPLES_APP } from '../../scheduling-examples.constants';
import { RunUserResolver } from '../../support/run-user.resolver';
import { DelayedRunWorkflow } from './delayed-run.workflow';

interface SignupBody {
  email?: string;
}

/** Delayed-run primitive: schedule a one-off follow-up after SCHEDULING_EXAMPLES_FOLLOWUP_DELAY_MS (default 10s). */
@Controller('webhooks/scheduling-examples')
export class DelayedRunController {
  private readonly logger = new Logger(DelayedRunController.name);

  constructor(
    private readonly workflowRunner: WorkflowRunner,
    private readonly runUser: RunUserResolver,
    private readonly scheduler: SchedulerRegistry,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('signup')
  async onSignup(@Body() body: SignupBody) {
    const email = body?.email ?? 'new.user@example.com';
    const delayMs = Number(this.configService.get('SCHEDULING_EXAMPLES_FOLLOWUP_DELAY_MS') ?? 10000);
    const name = `signup-followup-${randomUUID()}`;

    const timeout = setTimeout(() => {
      this.scheduler.deleteTimeout(name);
      void this.fire(email);
    }, delayMs);
    this.scheduler.addTimeout(name, timeout);

    return { ok: true, email, followupInMs: delayMs };
  }

  private async fire(email: string) {
    const userId = await this.runUser.resolve();
    if (!userId) {
      this.logger.warn('No local user — skipping follow-up.');
      return;
    }
    const { workflowId } = await this.workflowRunner.run(
      DelayedRunWorkflow,
      { email },
      { appName: SCHEDULING_EXAMPLES_APP, userId },
    );
    this.logger.log(`Delayed follow-up posted for ${email} (workflow ${workflowId})`);
  }
}
