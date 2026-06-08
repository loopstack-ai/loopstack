import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { EnvironmentService } from '@loopstack/remote-client';

const execFileAsync = promisify(execFile);

export interface ProvisionedSandbox {
  containerId: string;
  agentUrl: string;
}

/** Provisions and tears down a local Docker sandbox running the Loopstack remote agent + Claude Code. */
@Injectable()
export class LocalSandboxService {
  private readonly logger = new Logger(LocalSandboxService.name);
  private readonly image = process.env.CLAUDE_SANDBOX_IMAGE ?? 'loopstack-remote-claude:latest';
  private readonly slotId = process.env.CLAUDE_SANDBOX_SLOT ?? 'sandbox';

  constructor(private readonly env: EnvironmentService) {}

  async provision(workspaceId: string, oauthToken?: string): Promise<ProvisionedSandbox> {
    const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
    if (!oauthToken && !apiKey) {
      this.logger.warn('No Claude OAuth token and no ANTHROPIC_API_KEY — Claude Code will fail to authenticate.');
    }

    const credentialArgs: string[] = [];
    if (oauthToken) credentialArgs.push('-e', `CLAUDE_CODE_OAUTH_TOKEN=${oauthToken}`);
    if (apiKey) credentialArgs.push('-e', `ANTHROPIC_API_KEY=${apiKey}`);

    const { stdout: idOut } = await execFileAsync('docker', [
      'run',
      '-d',
      '--rm',
      '-p',
      '3001',
      '-e',
      'AGENT_PORT=3001',
      '-e',
      'WORKSPACE_ROOT=/workspace',
      ...credentialArgs,
      this.image,
    ]);
    const containerId = idOut.trim();
    this.logger.log(`Sandbox container started: ${containerId.slice(0, 12)}`);

    try {
      const port = await this.resolveHostPort(containerId);
      const agentUrl = `http://localhost:${port}`;
      await this.waitForHealth(agentUrl);

      await this.env.replaceAll(workspaceId, [
        {
          slotId: this.slotId,
          type: 'sandbox',
          remoteEnvironmentId: containerId,
          agentUrl,
          connectionUrl: agentUrl,
          local: true,
        },
      ]);

      return { containerId, agentUrl };
    } catch (error) {
      await this.teardown(containerId);
      throw error;
    }
  }

  async teardown(containerId: string): Promise<void> {
    if (!containerId) return;
    try {
      await execFileAsync('docker', ['rm', '-f', containerId]);
    } catch (error) {
      this.logger.warn(`Failed to remove container ${containerId.slice(0, 12)}: ${this.message(error)}`);
    }
  }

  private async resolveHostPort(containerId: string): Promise<string> {
    const { stdout } = await execFileAsync('docker', [
      'inspect',
      '--format',
      '{{ (index (index .NetworkSettings.Ports "3001/tcp") 0).HostPort }}',
      containerId,
    ]);
    const port = stdout.trim();
    if (!port) {
      throw new Error(`Could not resolve mapped host port for container ${containerId}`);
    }
    return port;
  }

  private async waitForHealth(agentUrl: string, attempts = 60, delayMs = 1000): Promise<void> {
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(`${agentUrl}/health`);
        if (res.ok) return;
      } catch {
        /* not ready */
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error(`Sandbox agent at ${agentUrl} did not become healthy in time`);
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
