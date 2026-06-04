import { Module } from '@nestjs/common';
import { HitlModule } from '@loopstack/hitl';
import { ClaudeAuthService } from './claude-auth.service';
import { ClaudeCodeWorkflow } from './claude-code.workflow';
import { LocalSandboxService } from './local-sandbox.service';

@Module({
  imports: [HitlModule],
  providers: [ClaudeAuthService, LocalSandboxService, ClaudeCodeWorkflow],
  exports: [ClaudeCodeWorkflow],
})
export class ClaudeSandboxModule {}
