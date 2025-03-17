import { Injectable } from '@nestjs/common';
import { ToolInterface } from '../../processor/interfaces/tool.interface';
import { ProcessStateInterface } from '../../processor/interfaces/process-state.interface';
import {NamespacesService} from "../../persistence/services/namespace.service";
import { z } from 'zod';
import { Tool } from '../../processor';

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
        target: ProcessStateInterface,
    ): Promise<ProcessStateInterface> {
        const validOptions = this.schema.parse(props);

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
