import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { SandboxFilesystemModule } from '@loopstack/sandbox-filesystem';
import { SandboxToolModule } from '@loopstack/sandbox-tool';
import { SandboxExampleWorkflow } from './workflows/sandbox/sandbox-example.workflow';

const WORKFLOWS = [SandboxExampleWorkflow];

@StudioApp({
  title: 'Sandbox Examples',
  workflows: WORKFLOWS,
})
@Module({
  imports: [SandboxFilesystemModule, SandboxToolModule],
  providers: WORKFLOWS,
  exports: WORKFLOWS,
})
export class SandboxExamplesModule {}
