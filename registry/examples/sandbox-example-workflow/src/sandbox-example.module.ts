import { Module } from '@nestjs/common';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { SandboxFilesystemModule } from '@loopstack/sandbox-filesystem';
import { SandboxToolModule } from '@loopstack/sandbox-tool';
import { SandboxExampleWorkflow } from './sandbox-example.workflow';

@Module({
  imports: [SandboxToolModule, SandboxFilesystemModule, CoreUiModule, CreateChatMessageToolModule],
  providers: [SandboxExampleWorkflow],
  exports: [SandboxExampleWorkflow],
})
export class SandboxExampleModule {}
