import { Injectable } from '@nestjs/common';
import {
  ToolApplicationInfo,
  ToolInterface,
  ToolResult,
} from '../../processor/interfaces/tool.interface';
import { NamespacesService } from '../../persistence/services/namespace.service';
import { z } from 'zod';
import { Tool } from '../../processor';
import { WorkflowEntity } from '../../persistence/entities';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { WorkflowData } from '../../processor/interfaces/workflow-data.interface';

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
