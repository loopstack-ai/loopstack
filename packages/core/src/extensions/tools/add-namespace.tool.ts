import { Injectable } from '@nestjs/common';
import { ToolInterface } from '../../processor/interfaces/tool.interface';
import { ProcessStateInterface } from '../../processor/interfaces/process-state.interface';
import { Tool } from '../../processor/decorators/tool.decorator';
import {NamespacesService} from "../../persistence/services/namespace.service";
import { z } from 'zod';

@Injectable()
@Tool()
export class AddNamespaceTool implements ToolInterface {

    argsSchema = z.object({
      label: z.string(),
      meta: z.any().optional(),
    });

    constructor(private namespacesService: NamespacesService) {}

    async apply(
        options: any,
        target: ProcessStateInterface,
    ): Promise<ProcessStateInterface> {
        const validOptions = this.argsSchema.parse(options);

        target.context.namespace = await this.namespacesService.create({
          name: validOptions.label,
          model: target.context.model,
          projectId: target.context.projectId,
          workspaceId: target.context.workspaceId,
          metadata: validOptions.meta,
          createdBy: target.context.userId,
          parent: target.context.namespace,
        });
        target.context.labels.push(target.context.namespace.name);

        return target;
    }
}
