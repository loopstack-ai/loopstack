import { BlockConfig, HandlerCallResult } from '@loopstack/common';
import { NamespacePropsSchema, TemplateExpression } from '@loopstack/contracts/schemas';
import { Logger } from '@nestjs/common';
import { Tool } from '../../workflow-processor';
import { z } from 'zod';
import { NamespacesService } from '../../persistence';

@BlockConfig({
  config: {
    description: 'Create a document.',
  },
  properties: NamespacePropsSchema.strict(),
  configSchema: z
    .object({
      label: z.union([z.string(), TemplateExpression]),
      meta: z.any().optional(),
    })
    .strict(),
})
export class CreateNamespaceTool extends Tool {
  protected readonly logger = new Logger(CreateNamespaceTool.name);

  constructor(private namespacesService: NamespacesService) {
    super();
  }

  async execute(): Promise<HandlerCallResult> {
    const namespace = await this.namespacesService.create({
      name: this.args.label,
      pipelineId: this.ctx.pipelineId,
      workspaceId: this.ctx.workspaceId,
      createdBy: this.ctx.userId,
      parent: this.ctx.namespace,
    });

    return {
      data: namespace,
    };
  }
}
