import { Module } from '@nestjs/common';
import { MathService } from './services/math.service.js';
import { MathSumTool } from './tools/index.js';
import { CounterTool } from './tools/index.js';
import { CustomToolExampleWorkflow } from './workflows/index.js';

@Module({
  providers: [CustomToolExampleWorkflow, MathSumTool, CounterTool, MathService],
  exports: [CustomToolExampleWorkflow, MathSumTool, CounterTool, MathService],
})
export class CustomToolModule {}
