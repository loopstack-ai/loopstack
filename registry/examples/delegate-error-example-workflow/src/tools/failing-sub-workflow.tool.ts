import { z } from 'zod';
import { BaseTool, InjectWorkflow, Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import { FailingWorkflow } from '../workflows/failing.workflow';

@Tool({
  uiConfig: {
    description:
      'Launch an async sub-workflow that always fails. ' +
      'Used to test that failed sub-workflow errors propagate back to the parent.',
  },
  schema: z.object({}),
})
export class FailingSubWorkflowTool extends BaseTool {
  @InjectWorkflow() private failingWorkflow: FailingWorkflow;

  async call(_args: object, options?: ToolCallOptions): Promise<ToolResult> {
    const result = await this.failingWorkflow.run({}, { alias: 'failingWorkflow', callback: options?.callback });

    return {
      data: { workflowId: result.workflowId },
      pending: { workflowId: result.workflowId },
    };
  }
}
