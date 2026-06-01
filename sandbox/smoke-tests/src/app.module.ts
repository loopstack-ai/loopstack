import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { ClaudeModule } from '@loopstack/claude-module';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { SmokeTestsModule } from './smoke-tests.module';

@Module({
  imports: [
    LoopstackModule.forRoot(),
    ClaudeModule,
    LlmProviderModule.forRoot({ model: 'claude-sonnet-4-5' }),
    AgentModule,
    SmokeTestsModule,
  ],
})
export class AppModule {}
