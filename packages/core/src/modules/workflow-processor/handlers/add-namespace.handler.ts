import { Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ContextInterface,
  Handler,
  HandlerInterface,
  HandlerCallResult,
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

@Handler({
  config,
  schema,
})
export class AddNamespaceHandler implements HandlerInterface {
  private readonly logger = new Logger(AddNamespaceHandler.name);

  constructor(private namespacesService: NamespacesService) {}

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
  ): Promise<HandlerCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
    }
    const namespace = await this.namespacesService.create({
      name: props.label,
      pipelineId: context.pipelineId,
      workspaceId: context.workspaceId,
      metadata: props.meta,
      createdBy: context.userId,
      parent: context.namespace,
    });

    if (!workflow.contextVariables) {
      workflow.contextVariables = {};
    }

    const contextLabels = context.labels;
    const workflowLabels = workflow.contextVariables.labels ?? [];

    workflow.contextVariables.labels = [
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
