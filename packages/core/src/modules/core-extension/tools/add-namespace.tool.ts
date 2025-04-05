import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  ContextInterface,
  Tool,
  ToolApplicationInfo,
  ToolInterface,
  ToolResult,
  WorkflowData,
  WorkflowEntity,
} from '@loopstack/shared';
import { NamespacesService } from '../../persistence';

@Injectable()
@Tool()
export class AddNamespaceTool implements ToolInterface {
  schema = z.object({
    label: z.string(),
    meta: z.any().optional(),
  });

  constructor(private namespacesService: NamespacesService) {}

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    data: WorkflowData | undefined,
    info: ToolApplicationInfo,
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

    return {
      context,
    };
  }
}
