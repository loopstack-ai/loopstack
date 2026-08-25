import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { ClassifyTicketTool } from './triage/classify-ticket.tool';
import { TriageTicketWorkflow } from './triage/triage-ticket.workflow';

@StudioApp({
  title: 'Testing Examples',
  workflows: [TriageTicketWorkflow],
})
@Module({
  providers: [TriageTicketWorkflow, ClassifyTicketTool],
})
export class TestingExamplesModule {}
