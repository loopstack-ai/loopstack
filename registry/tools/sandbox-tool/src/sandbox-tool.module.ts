import { Module } from '@nestjs/common';
import { DockerContainerManagerService } from './services/docker-container-manager.service.js';
import { SandboxCommand } from './tools/sandbox-command.tool.js';
import { SandboxDestroy } from './tools/sandbox-destroy.tool.js';
import { SandboxInit } from './tools/sandbox-init.tool.js';

@Module({
  imports: [],
  providers: [DockerContainerManagerService, SandboxInit, SandboxDestroy, SandboxCommand],
  exports: [DockerContainerManagerService, SandboxInit, SandboxDestroy, SandboxCommand],
})
export class SandboxToolModule {}
