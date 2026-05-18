import { Injectable } from '@nestjs/common';
import { InjectWorkflow, Workspace } from '@loopstack/common';
import { DynamicRoutingExampleWorkflow } from './dynamic-routing/dynamic-routing-example.workflow.js';
import { RunSubWorkflowExampleParentWorkflow } from './run-sub-workflow-example/run-sub-workflow-example-parent.workflow.js';

@Injectable()
@Workspace({
  uiConfig: {
    title: 'Default Workspace',
  },
})
export class DefaultWorkspace {
  @InjectWorkflow() test: RunSubWorkflowExampleParentWorkflow;
  @InjectWorkflow() test2: DynamicRoutingExampleWorkflow;
}
