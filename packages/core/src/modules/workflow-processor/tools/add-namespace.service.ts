import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  ContextInterface,
  Tool,
  EvalContextInfo,
  ToolInterface,
  ToolResult,
  WorkflowEntity,
} from '@loopstack/shared';
import { NamespacesService } from '../../persistence';

@Injectable()
@Tool()
export class AddNamespaceService implements ToolInterface {
  private readonly logger = new Logger(AddNamespaceService.name);
  schema = z.object({
    label: z.string(),
    meta: z.any().optional(),
  });

  constructor(private namespacesService: NamespacesService) {}

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    info: EvalContextInfo,
  ): Promise<ToolResult> {
    const validOptions = this.schema.parse(props);

    context.namespace = await this.namespacesService.create({
      name: validOptions.label,
      model: context.model,
      projectId: context.projectId,
      workspaceId: context.workspaceId,
      metadata: validOptions.meta,
      createdBy: context.userId,
      parent: context.namespace,
    });
    context.labels.push(context.namespace.name);

    this.logger.debug(`Add namespace label "${context.namespace.name}".`);

    return {
      context,
    };
  }
}
