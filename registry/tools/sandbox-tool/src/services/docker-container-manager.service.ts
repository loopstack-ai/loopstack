/*
Copyright 2025 The Loopstack Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import Docker from 'dockerode';
import * as path from 'path';
import { PassThrough } from 'stream';

export const DOCKER_CLIENT = Symbol('DOCKER_CLIENT');

export interface ContainerConfig {
  imageName: string;
  containerName: string;
  projectOutPath: string;
  rootPath: string;
}

export interface CommandExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

interface ExecuteCommandOptions {
  containerId: string;
  executable: string;
  args?: string[];
  workingDirectory?: string;
  envVars?: string[];
  timeout?: number;
  trimOutput?: boolean;
}

interface ContainerEntry {
  container: Docker.Container;
  config: ContainerConfig;
  lock: Promise<void>;
}

@Injectable()
export class DockerContainerManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(DockerContainerManagerService.name);
  private readonly containers = new Map<string, ContainerEntry>();
  private readonly configs = new Map<string, ContainerConfig>();
  private readonly locks = new Map<string, Promise<void>>();

  constructor(
    @Optional()
    @Inject(DOCKER_CLIENT)
    private readonly docker: Docker = new Docker(),
  ) {}

  registerContainer(containerId: string, config: ContainerConfig): void {
    this.configs.set(containerId, config);
    this.logger.log(`Registered container config '${containerId}': ${config.containerName}`);
  }

  unregisterContainer(containerId: string): void {
    this.configs.delete(containerId);
    this.logger.log(`Unregistered container config '${containerId}'`);
  }

  getRegisteredContainerIds(): string[] {
    return Array.from(this.configs.keys());
  }

  async ensureContainer(containerId: string): Promise<Docker.Container> {
    const config = this.configs.get(containerId);
    if (!config) {
      throw new Error(`Container '${containerId}' not registered. Call registerContainer() first.`);
    }

    // Use a promise chain to serialize container operations per containerId
    const previousLock = this.locks.get(containerId) ?? Promise.resolve();
    let releaseLock: () => void;
    const newLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.locks.set(containerId, newLock);

    try {
      await previousLock;
      return await this.ensureContainerInternal(containerId, config);
    } finally {
      releaseLock!();
    }
  }

  private async ensureContainerInternal(containerId: string, config: ContainerConfig): Promise<Docker.Container> {
    const entry = this.containers.get(containerId);

    if (entry) {
      const isRunning = await this.tryStartExistingContainer(entry.container);
      if (isRunning) return entry.container;
      this.containers.delete(containerId);
    }

    const existingContainer = await this.findExistingContainer(config);
    if (existingContainer) {
      this.containers.set(containerId, {
        container: existingContainer,
        config,
        lock: Promise.resolve(),
      });
      return existingContainer;
    }

    const newContainer = await this.createNewContainer(config);
    this.containers.set(containerId, {
      container: newContainer,
      config,
      lock: Promise.resolve(),
    });
    return newContainer;
  }

  async executeCommand(options: ExecuteCommandOptions): Promise<CommandExecutionResult> {
    const {
      containerId,
      executable,
      args = [],
      workingDirectory = '/',
      envVars,
      timeout = 30000,
      trimOutput = true,
    } = options;

    const container = await this.ensureContainer(containerId);
    const validatedWorkDir = this.validateAndNormalizePath(workingDirectory);

    this.logger.debug(`Executing ${executable} in ${validatedWorkDir} (container: ${containerId})`);

    const shellCommand = this.buildSafeCommand(executable, args);

    const exec = await container.exec({
      Cmd: ['sh', '-c', `cd ${this.escapeShellArg(validatedWorkDir)} && ${shellCommand}`],
      AttachStdout: true,
      AttachStderr: true,
      Env: envVars?.length ? envVars : undefined,
    });

    const stream = await exec.start({ Detach: false });
    const result = await this.collectStreamOutput(stream, exec, timeout, trimOutput);

    if (result.exitCode !== 0) {
      this.logger.warn(`Command failed with exit code ${result.exitCode}: ${result.stderr}`);
    }

    return result;
  }

  private buildSafeCommand(executable: string, args: string[]): string {
    const safeExecutable = this.escapeShellArg(executable);
    const safeArgs = args.map((arg) => this.escapeShellArg(arg)).join(' ');
    return safeArgs ? `${safeExecutable} ${safeArgs}` : safeExecutable;
  }

  getDockerContainerId(containerId: string): string | undefined {
    return this.containers.get(containerId)?.container.id;
  }

  async getContainerStatus(containerId: string): Promise<{
    registered: boolean;
    exists: boolean;
    running: boolean;
    dockerId?: string;
  }> {
    const config = this.configs.get(containerId);
    if (!config) {
      return { registered: false, exists: false, running: false };
    }

    const entry = this.containers.get(containerId);
    if (!entry) {
      return { registered: true, exists: false, running: false };
    }

    try {
      const info = await entry.container.inspect();
      return {
        registered: true,
        exists: true,
        running: info.State.Running,
        dockerId: entry.container.id,
      };
    } catch {
      return { registered: true, exists: false, running: false };
    }
  }

  async stopContainer(containerId: string): Promise<void> {
    const entry = this.containers.get(containerId);
    if (!entry) return;

    try {
      const info = await entry.container.inspect();
      if (info.State.Running) {
        await entry.container.stop();
        this.logger.log(`Container '${containerId}' stopped successfully`);
      }
    } catch {
      // Container may already be stopped or removed
    }
  }

  async removeContainer(containerId: string): Promise<void> {
    const entry = this.containers.get(containerId);
    if (!entry) return;

    try {
      await entry.container.remove({ force: true });
      this.logger.log(`Container '${containerId}' removed successfully`);
    } catch {
      // Container may already be removed
    }

    this.containers.delete(containerId);
  }

  async onModuleDestroy(): Promise<void> {
    const stopPromises = Array.from(this.containers.keys()).map((id) => this.stopContainer(id));
    await Promise.all(stopPromises);
    this.containers.clear();
    this.configs.clear();
    this.locks.clear();
  }

  // --- Private helpers ---

  private escapeShellArg(arg: string): string {
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  private validateAndNormalizePath(inputPath: string): string {
    const normalized = path.posix.normalize(inputPath);

    if (normalized.includes('..')) {
      throw new Error(`Path traversal detected: ${inputPath}`);
    }

    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }

  private async tryStartExistingContainer(container: Docker.Container): Promise<boolean> {
    try {
      const info = await container.inspect();
      if (info.State.Running) return true;
      await container.start();
      this.logger.log('Started existing container');
      return true;
    } catch {
      this.logger.warn('Existing container reference is invalid, will recreate');
      return false;
    }
  }

  private async findExistingContainer(config: ContainerConfig): Promise<Docker.Container | null> {
    const containers = await this.docker.listContainers({ all: true });
    const existing = containers.find((c) => c.Names.includes(`/${config.containerName}`));

    if (!existing) return null;

    const container = this.docker.getContainer(existing.Id);

    try {
      const info = await container.inspect();
      if (!info.State.Running) {
        await container.start();
        this.logger.log('Started existing container');
      }
      return container;
    } catch (err) {
      this.logger.warn(`Failed to start existing container, will recreate: ${(err as Error).message}`);
      try {
        await container.remove({ force: true });
      } catch {
        // Ignore removal errors
      }
      return null;
    }
  }

  private async createNewContainer(config: ContainerConfig): Promise<Docker.Container> {
    await this.ensureImage(config.imageName);

    const container = await this.docker.createContainer({
      Image: config.imageName,
      name: config.containerName,
      Cmd: ['sleep', 'infinity'],
      Tty: false,
      HostConfig: {
        Binds: [`${config.projectOutPath}:/${config.rootPath}`],
      },
    });

    await container.start();
    this.logger.log(`Created and started new container: ${config.containerName}`);

    return container;
  }

  private async ensureImage(imageName: string): Promise<void> {
    try {
      await this.docker.getImage(imageName).inspect();
      this.logger.log(`Image ${imageName} already exists`);
    } catch {
      this.logger.log(`Pulling Docker image: ${imageName}`);
      await this.pullImage(imageName);
      this.logger.log('Image pulled successfully');
    }
  }

  private pullImage(imageName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      void this.docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        this.docker.modem.followProgress(stream, (progressErr: Error | null) => {
          if (progressErr) return reject(progressErr);
          resolve();
        });
      });
    });
  }

  private collectStreamOutput(
    stream: NodeJS.ReadableStream & { destroy(): void },
    exec: Docker.Exec,
    timeout: number,
    trimOutput: boolean,
  ): Promise<CommandExecutionResult> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let settled = false;

      const settle = (action: 'resolve' | 'reject', value: CommandExecutionResult | Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        if (action === 'resolve') {
          resolve(value as CommandExecutionResult);
        } else {
          reject(value as Error);
        }
      };

      const timeoutId = setTimeout(() => {
        stream.destroy();
        settle('resolve', {
          stdout: trimOutput ? stdout.trim() : stdout,
          stderr: trimOutput ? stderr.trim() : stderr,
          exitCode: -1,
          timedOut: true,
        });
      }, timeout);

      const stdoutStream = new PassThrough();
      const stderrStream = new PassThrough();

      stdoutStream.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      stderrStream.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      this.docker.modem.demuxStream(stream, stdoutStream, stderrStream);

      stream.on('end', () => {
        if (settled) return;
        exec
          .inspect()
          .then((inspectResult) => {
            settle('resolve', {
              stdout: trimOutput ? stdout.trim() : stdout,
              stderr: trimOutput ? stderr.trim() : stderr,
              exitCode: inspectResult.ExitCode ?? 0,
              timedOut: false,
            });
          })
          .catch((err) => {
            settle('reject', err instanceof Error ? err : new Error(String(err)));
          });
      });

      stream.on('error', (err: Error) => {
        settle('reject', err);
      });
    });
  }
}
