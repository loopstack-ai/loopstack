import { Module } from '@nestjs/common';
import { MathService } from './services/math.service';
import { MathSumTool } from './tools';
import { CounterTool } from './tools';
import { CustomToolExampleWorkflow } from './workflows';

@Module({
  providers: [CustomToolExampleWorkflow, MathSumTool, CounterTool, MathService],
  exports: [CustomToolExampleWorkflow, MathSumTool, CounterTool, MathService],
})
export class CustomToolModule {}
