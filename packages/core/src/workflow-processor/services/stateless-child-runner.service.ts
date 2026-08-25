import { Injectable, Logger } from '@nestjs/common';
import {
  InternalRunContext,
  WorkflowInterface,
  WorkflowMetadataInterface,
  getBlockArgsSchema,
} from '@loopstack/common';
import { BlockProcessor } from './block-processor.service.js';

/**
 * Executes a sub-workflow inline for stateless runs. Deliberately independent of
 * `RootProcessorService` (which depends on the orchestrator) so the orchestration
 * service can invoke children without a DI cycle.
 */
@Injectable()
export class StatelessChildRunner {
  private readonly logger = new Logger(StatelessChildRunner.name);

  constructor(private readonly blockProcessor: BlockProcessor) {}

  async run(
    workflow: WorkflowInterface,
    params: {
      workflowName: string;
      userId: string;
      workspaceId: string;
      args?: Record<string, unknown>;
    },
  ): Promise<WorkflowMetadataInterface> {
    const ctx: InternalRunContext = {
      root: params.workflowName,
      userId: params.userId,
      workspaceId: params.workspaceId,
      labels: [],
      payload: {},
      options: { stateless: true },
    };

    this.logger.debug(`Running stateless sub-workflow inline: ${params.workflowName}`);

    const schema = getBlockArgsSchema(workflow);
    const validArgs = schema ? (schema.parse(params.args ?? {}) as Record<string, unknown>) : params.args;

    return this.blockProcessor.processBlock(workflow, validArgs, ctx);
  }
}
