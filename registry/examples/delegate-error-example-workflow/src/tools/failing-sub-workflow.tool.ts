import { z } from 'zod';
import { BaseTool, Tool, ToolCallOptions, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { FailingWorkflow } from '../workflows/failing.workflow';

export type FailingSubWorkflowToolResult = { workflowId: string };

@Tool({
  name: 'failing_sub_workflow',
  description:
    'Launch an async sub-workflow that always fails. ' +
    'Used to test that failed sub-workflow errors propagate back to the parent.',
  schema: z.object({}),
})
export class FailingSubWorkflowTool extends BaseTool<object, object, FailingSubWorkflowToolResult> {
  constructor(private readonly failingWorkflow: FailingWorkflow) {
    super();
  }

  protected async handle(
    _args: object,
    _ctx: LoopstackContext,
    options?: ToolCallOptions,
  ): Promise<ToolResult<FailingSubWorkflowToolResult>> {
    const result = await this.failingWorkflow.run({}, { callback: options?.callback });

    return {
      data: { workflowId: result.workflowId },
      pending: { workflowId: result.workflowId },
    };
  }
}
