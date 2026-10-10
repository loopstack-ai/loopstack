import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { SandboxToolModule } from '@loopstack/docker-sandbox';
import { SandboxFilesystemModule } from '@loopstack/docker-sandbox-filesystem';
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
