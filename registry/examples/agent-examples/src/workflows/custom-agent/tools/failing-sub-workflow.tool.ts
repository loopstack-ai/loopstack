import { z } from 'zod';
import { BaseTool, Tool, ToolCallOptions, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { FailingSubWorkflow } from '../failing-sub.workflow';

export type FailingSubWorkflowToolResult = { workflowId: string };

@Tool({
  name: 'failing_sub_workflow',
  description:
    'Launch an async sub-workflow that always fails. ' +
    'Used to test that failed sub-workflow errors propagate back to the parent.',
  schema: z.object({}),
})
export class FailingSubWorkflowTool extends BaseTool<object, object, FailingSubWorkflowToolResult> {
  constructor(private readonly failingWorkflow: FailingSubWorkflow) {
    super();
  }

  protected async handle(
    _args: object,
    _ctx: RunContext,
    options?: ToolCallOptions,
  ): Promise<ToolEnvelope<FailingSubWorkflowToolResult>> {
    const result = await this.failingWorkflow.run({}, { callback: options?.callback });

    return {
      data: { workflowId: result.workflowId },
      pending: { workflowId: result.workflowId },
    };
  }
}
