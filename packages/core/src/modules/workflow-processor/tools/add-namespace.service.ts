import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ContextInterface,
  Tool,
  EvalContextInfo,
  ToolInterface,
  ToolResult,
  WorkflowEntity,
  NamespacePropsSchema,
} from '@loopstack/shared';
import { NamespacesService } from '../../persistence';

@Injectable()
@Tool()
export class AddNamespaceService implements ToolInterface {
  private readonly logger = new Logger(AddNamespaceService.name);
  schema = NamespacePropsSchema;

  constructor(private namespacesService: NamespacesService) {}

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    info: EvalContextInfo,
  ): Promise<ToolResult> {
    if (!workflow) {
      return {}
    }

    const validOptions = this.schema.parse(props);
    const namespace = await this.namespacesService.create({
      name: validOptions.label,
      model: context.model,
      projectId: context.projectId,
      workspaceId: context.workspaceId,
      metadata: validOptions.meta,
      createdBy: context.userId,
      parent: context.namespace,
    });

    if (!workflow.contextUpdate) {
      workflow.contextUpdate = {};
    }

    const contextLabels = context.labels
    const workflowLabels = workflow.contextUpdate.labels ?? [];

    workflow!.contextUpdate.labels = [
      ...contextLabels,
      ...workflowLabels,
      namespace.name,
    ];

    this.logger.debug(`Add namespace label "${namespace.name}".`);

    return {
      workflow,
    };
  }
}
