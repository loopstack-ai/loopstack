import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { SandboxFilesystemModule } from '@loopstack/sandbox-filesystem';
import { SandboxToolModule } from '@loopstack/sandbox-tool';
import { SandboxExampleWorkflow } from './sandbox-example.workflow';

@Module({
  imports: [SandboxToolModule, SandboxFilesystemModule, LoopCoreModule],
  providers: [SandboxExampleWorkflow],
  exports: [SandboxExampleWorkflow],
})
export class SandboxExampleModule {}
