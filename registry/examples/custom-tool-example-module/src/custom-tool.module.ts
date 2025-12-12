import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { CoreToolsModule } from '@loopstack/core-tools-module';
import { MathSumTool } from './tools/math-sum.tool';
import { CounterTool } from './tools/counter.tool';
import { MathService } from './services/math.service';
import { CustomToolExampleWorkflow } from './workflows/custom-tool-example.workflow';

@Module({
  imports: [LoopCoreModule, CoreToolsModule, CoreUiModule],
  providers: [
    CustomToolExampleWorkflow,
    MathSumTool,
    CounterTool,
    MathService,
  ],
  exports: [
    CustomToolExampleWorkflow,
    MathSumTool,
    CounterTool,
    MathService,
  ]
})
export class CustomToolModule {}
