import { Module } from '@nestjs/common';
import { SandboxFilesystemModule } from '@loopstack/sandbox-filesystem';
import { SandboxExampleWorkflow } from './sandbox-example.workflow';

@Module({
  imports: [SandboxFilesystemModule],
  providers: [SandboxExampleWorkflow],
  exports: [SandboxExampleWorkflow],
})
export class SandboxExampleModule {}
