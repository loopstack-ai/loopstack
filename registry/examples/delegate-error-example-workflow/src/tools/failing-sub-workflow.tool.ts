import { Inject } from '@nestjs/common';
import { z } from 'zod';
import {
  BaseTool,
  Tool,
  ToolCallOptions,
  ToolResult,
  WORKFLOW_ORCHESTRATOR,
  WorkflowOrchestrator,
} from '@loopstack/common';
import { FailingWorkflow } from '../workflows/failing.workflow';

export type FailingSubWorkflowToolResult = { workflowId: string };

@Tool({
  name: 'failing_sub_workflow',
  uiConfig: {
    description:
      'Launch an async sub-workflow that always fails. ' +
      'Used to test that failed sub-workflow errors propagate back to the parent.',
  },
  schema: z.object({}),
})
export class FailingSubWorkflowTool extends BaseTool<object, object, FailingSubWorkflowToolResult> {
  constructor(@Inject(WORKFLOW_ORCHESTRATOR) private readonly orchestrator: WorkflowOrchestrator) {
    super();
  }

  protected async handle(_args: object, options?: ToolCallOptions): Promise<ToolResult<FailingSubWorkflowToolResult>> {
    const result = await this.orchestrator.queue(
      {},
      { workflowName: FailingWorkflow.name, callback: options?.callback },
    );

    return {
      data: { workflowId: result.workflowId },
      pending: { workflowId: result.workflowId },
    };
  }
}
