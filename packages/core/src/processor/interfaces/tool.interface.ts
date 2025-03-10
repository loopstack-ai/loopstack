import { ProcessStateInterface } from './process-state.interface';
import { ZodType } from 'zod';

export interface ToolInterface {
  argsSchema: ZodType | undefined;
  apply(
    options: any,
    target: ProcessStateInterface,
    source: ProcessStateInterface,
  ): Promise<ProcessStateInterface>;
}
