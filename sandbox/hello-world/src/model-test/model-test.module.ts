import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { ModelTestController } from './model-test.controller';
import { ModelTestWorkflow } from './model-test.workflow';

@StudioApp({ title: 'Model Test' })
@Module({
  imports: [
    ClaudeModule,
    LlmProviderModule.forFeature({ model: 'claude-opus-4-6' }),
  ],
  controllers: [ModelTestController],
  providers: [ModelTestWorkflow],
})
export class ModelTestModule {}
