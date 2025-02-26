import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ToolInterface } from '../interfaces/tool.interface';
import { ProcessStateInterface } from '../../processor/interfaces/process-state.interface';
import { Tool } from '../../processor/decorators/tool.decorator';

@Injectable()
@Tool()
export class LoadDocumentTool implements ToolInterface {
  schema = z.object({
    name: z.string(),
    type: z.string().optional(),
    namespaces: z.any().optional(),
    map: z.string().optional(),
    filter: z.string().optional(),
    many: z.boolean().optional(),
    ignoreChanges: z.boolean().optional(),
    global: z.boolean().optional(),
  });

  apply(data: any, target: ProcessStateInterface, source: ProcessStateInterface): ProcessStateInterface {
    const options = this.schema.parse(data);



    return target;
  }
}
