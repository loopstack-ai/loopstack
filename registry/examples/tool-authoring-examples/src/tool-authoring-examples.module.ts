import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { CustomToolExampleWorkflow } from './workflows/custom-tool/custom-tool-example.workflow';
import { MathService } from './workflows/custom-tool/services/math.service';
import { CounterTool, MathSumTool } from './workflows/custom-tool/tools';

const WORKFLOWS = [CustomToolExampleWorkflow];

@StudioApp({
  title: 'Tool Authoring Examples',
  workflows: WORKFLOWS,
})
@Module({
  providers: [MathService, MathSumTool, CounterTool, ...WORKFLOWS],
  exports: WORKFLOWS,
})
export class ToolAuthoringExamplesModule {}
