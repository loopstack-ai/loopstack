import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkflowRunner } from '@loopstack/core';
import { SCHEDULING_EXAMPLES_APP } from '../../scheduling-examples.constants';
import { RunUserResolver } from '../../support/run-user.resolver';
import { CronTriggerWorkflow } from './cron-trigger.workflow';

/** Cron primitive: fires CronTriggerWorkflow every minute. Off unless SCHEDULING_EXAMPLES_CRON_ENABLED=true. */
@Injectable()
export class CronTriggerScheduler {
  private readonly logger = new Logger(CronTriggerScheduler.name);

  constructor(
    private readonly workflowRunner: WorkflowRunner,
    private readonly runUser: RunUserResolver,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    if (this.configService.get('SCHEDULING_EXAMPLES_CRON_ENABLED') !== 'true') {
      return;
    }

    const userId = await this.runUser.resolve();
    if (!userId) {
      return;
    }
    const timestamp = new Date().toISOString();

    const { workflowId } = await this.workflowRunner.run(
      CronTriggerWorkflow,
      { message: `hello world ${timestamp}` },
      { appName: SCHEDULING_EXAMPLES_APP, userId },
    );
    this.logger.log(`Cron posted "hello world" (workflow ${workflowId})`);
  }
}
