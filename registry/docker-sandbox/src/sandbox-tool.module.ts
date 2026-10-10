import { Module } from '@nestjs/common';
import { DockerContainerManagerService } from './services/docker-container-manager.service.js';
import { SandboxCommand } from './tools/sandbox-command.tool.js';
import { SandboxDestroy } from './tools/sandbox-destroy.tool.js';
import { SandboxInit } from './tools/sandbox-init.tool.js';

/**
 * NestJS module that provides Docker sandbox tools — initialize, run commands in, and destroy
 * isolated containers (`SandboxInit`, `SandboxCommand`, `SandboxDestroy`) — plus the
 * `DockerContainerManagerService` that manages container lifecycle.
 *
 * Registration:
 * - `SandboxToolModule` — bare import; registers the sandbox tools and the container manager service.
 *
 * Requires: a running Docker daemon on the host; no other Loopstack modules.
 *
 * @public
 */
@Module({
  imports: [],
  providers: [DockerContainerManagerService, SandboxInit, SandboxDestroy, SandboxCommand],
  exports: [DockerContainerManagerService, SandboxInit, SandboxDestroy, SandboxCommand],
})
export class SandboxToolModule {}
