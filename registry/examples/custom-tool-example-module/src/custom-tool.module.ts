import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { MathSumTool } from './tools';
import { CounterTool } from './tools';
import { MathService } from './services/math.service';
import { CustomToolExampleWorkflow } from './workflows';

@Module({
  imports: [LoopCoreModule, CoreUiModule],
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
