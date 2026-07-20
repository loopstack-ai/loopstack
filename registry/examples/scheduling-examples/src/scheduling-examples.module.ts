import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudioApp, User } from '@loopstack/common';
import { SCHEDULING_EXAMPLES_APP } from './scheduling-examples.constants';
import { RunUserResolver } from './support/run-user.resolver';
import { BatchTriggerController } from './workflows/batch-trigger/batch-trigger.controller';
import { BatchTriggerWorkflow } from './workflows/batch-trigger/batch-trigger.workflow';
import { CallNewsletterWorkflow } from './workflows/batch-trigger/call-newsletter.workflow';
import { CronTriggerScheduler } from './workflows/cron-trigger/cron-trigger.scheduler';
import { CronTriggerWorkflow } from './workflows/cron-trigger/cron-trigger.workflow';
import { CallSignupWorkflow } from './workflows/delayed-run/call-signup.workflow';
import { DelayedRunController } from './workflows/delayed-run/delayed-run.controller';
import { DelayedRunWorkflow } from './workflows/delayed-run/delayed-run.workflow';
import { CallWebhookWorkflow } from './workflows/webhook-trigger/call-webhook.workflow';
import { WebhookTriggerController } from './workflows/webhook-trigger/webhook-trigger.controller';
import { WebhookTriggerWorkflow } from './workflows/webhook-trigger/webhook-trigger.workflow';

// Only the trigger workflows are launchable in Studio; the work workflows are providers-only
// so their triggers can resolve them via WorkflowRunner.
const TRIGGER_WORKFLOWS = [CallWebhookWorkflow, CallSignupWorkflow, CallNewsletterWorkflow];

const WORK_WORKFLOWS = [CronTriggerWorkflow, WebhookTriggerWorkflow, DelayedRunWorkflow, BatchTriggerWorkflow];

const ALL_WORKFLOWS = [...TRIGGER_WORKFLOWS, ...WORK_WORKFLOWS];

@StudioApp({
  app: SCHEDULING_EXAMPLES_APP,
  title: 'Scheduling Examples',
  workflows: TRIGGER_WORKFLOWS,
})
@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([User])],
  controllers: [WebhookTriggerController, DelayedRunController, BatchTriggerController],
  providers: [RunUserResolver, CronTriggerScheduler, ...ALL_WORKFLOWS],
  exports: ALL_WORKFLOWS,
})
export class SchedulingExamplesModule {}
