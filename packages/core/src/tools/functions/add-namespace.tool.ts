import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ToolInterface } from '../interfaces/tool.interface';
import { ProcessStateInterface } from '../../processor/interfaces/process-state.interface';
import { Tool } from '../../processor/decorators/tool.decorator';
import {NamespacesService} from "../../persistence/services/namespace.service";

@Injectable()
@Tool()
export class AddNamespaceTool implements ToolInterface {

    constructor(private namespacesService: NamespacesService) {}

    schema = z.object({
        label: z.string(),
        meta: z.any().optional(),
    });

    async apply(
        options: any,
        target: ProcessStateInterface,
    ): Promise<ProcessStateInterface> {
        const validOptions = this.schema.parse(options);

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
