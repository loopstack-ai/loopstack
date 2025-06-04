import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ContextInterface,
  Tool,
  ToolInterface,
  ToolResult,
  WorkflowEntity,
  NamespacePropsSchema,
  ExpressionString,
} from '@loopstack/shared';
import { NamespacesService } from '../../persistence';

const config = z
  .object({
    label: z.union([z.string(), ExpressionString]),
    meta: z.any().optional(),
  })
  .strict();

const schema = NamespacePropsSchema.strict();

@Injectable()
@Tool({
  name: 'addNamespace',
  description: 'Add a namespace to the context object',
  config,
  schema,
})
export class AddNamespaceService implements ToolInterface {
  private readonly logger = new Logger(AddNamespaceService.name);

  constructor(private namespacesService: NamespacesService) {}

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
  ): Promise<ToolResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }
    const namespace = await this.namespacesService.create({
      name: props.label,
      model: context.model,
      projectId: context.projectId,
      workspaceId: context.workspaceId,
      metadata: props.meta,
      createdBy: context.userId,
      parent: context.namespace,
    });

    if (!workflow.contextUpdate) {
      workflow.contextUpdate = {};
    }

    const contextLabels = context.labels;
    const workflowLabels = workflow.contextUpdate.labels ?? [];

    workflow.contextUpdate.labels = [
      ...contextLabels,
      ...workflowLabels,
      namespace.name,
    ];

    this.logger.debug(`Add namespace label "${namespace.name}".`);

    return {
      success: true,
      workflow,
    };
  }
}
