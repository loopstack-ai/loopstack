import { Inject, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { CommandExecutionResult, DockerContainerManagerService } from '../services/docker-container-manager.service.js';

const inputSchema = z
  .object({
    containerId: z.string().describe('The ID of the registered container to execute the command in'),
    executable: z.string().describe("The executable to run (e.g., 'npm', 'node', 'python')"),
    args: z.array(z.string()).optional().describe('Arguments to pass to the executable'),
    workingDirectory: z.string().default('/').describe('The working directory for command execution'),
    envVars: z.array(z.string()).optional().describe('Environment variables in KEY=VALUE format'),
    timeout: z.number().default(30000).describe('Timeout in milliseconds for the command execution'),
  })
  .strict();

/**
 * Args for `SandboxCommand`.
 *
 * Identifies the target container and the executable to run, with optional args, working directory,
 * environment variables, and timeout.
 *
 * @public
 */
export type SandboxCommandArgs = z.infer<typeof inputSchema>;

/**
 * Tool that executes a command inside a sandbox container and captures its stdout, stderr, and exit code.
 *
 * @providedBy SandboxToolModule
 * @public
 */
@Tool({
  name: 'sandbox_command',
  description: 'Execute a command in the sandbox environment',
  schema: inputSchema,
})
export class SandboxCommand extends BaseTool<SandboxCommandArgs, object, CommandExecutionResult> {
  private readonly logger = new Logger(SandboxCommand.name);

  @Inject()
  private readonly containerManager: DockerContainerManagerService;

  protected async handle(args: SandboxCommandArgs): Promise<ToolEnvelope<CommandExecutionResult>> {
    const argsStr = args.args?.length ? ` ${args.args.join(' ')}` : '';
    this.logger.debug(
      `Executing command: ${args.executable}${argsStr} in container ${args.containerId} (workDir: ${args.workingDirectory})`,
    );

    const result = await this.containerManager.executeCommand({
      containerId: args.containerId,
      executable: args.executable,
      args: args.args,
      workingDirectory: args.workingDirectory,
      envVars: args.envVars,
      timeout: args.timeout,
    });

    if (result.timedOut) {
      this.logger.warn(`Command timed out after ${args.timeout}ms: ${args.executable}${argsStr}`);
    } else if (result.exitCode !== 0) {
      this.logger.debug(`Command exited with code ${result.exitCode}: ${args.executable}${argsStr}`);
    } else {
      this.logger.debug(`Command completed successfully: ${args.executable}${argsStr}`);
    }

    return { data: result };
  }
}
