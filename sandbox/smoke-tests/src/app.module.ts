import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { ClaudeModule } from '@loopstack/claude-module';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { RemoteClientModule } from '@loopstack/remote-client';
import { SmokeTestsModule } from './smoke-tests.module';

@Module({
  imports: [
    LoopstackModule.forRoot(),
    RemoteClientModule.forRoot({
      environments: {
        available: [
          {
            type: 'sandbox',
            name: 'Local Remote Server',
            connectionUrl: process.env.SANDBOX_URL ?? 'http://localhost:3080',
            agentUrl: process.env.SANDBOX_AGENT_URL ?? 'http://localhost:3031',
            local: true,
          },
        ],
      },
    }),
    ClaudeModule,
    LlmProviderModule.forRoot({ model: 'claude-sonnet-4-5' }),
    AgentModule,
    SmokeTestsModule,
  ],
})
export class AppModule {}
