import { Module } from '@nestjs/common';
import { DockerContainerManagerService } from './services/docker-container-manager.service';
import { SandboxCommand } from './tools/sandbox-command.tool';
import { SandboxDestroy } from './tools/sandbox-destroy.tool';
import { SandboxInit } from './tools/sandbox-init.tool';

@Module({
  imports: [],
  providers: [DockerContainerManagerService, SandboxInit, SandboxDestroy, SandboxCommand],
  exports: [DockerContainerManagerService, SandboxInit, SandboxDestroy, SandboxCommand],
})
export class SandboxToolModule {}
