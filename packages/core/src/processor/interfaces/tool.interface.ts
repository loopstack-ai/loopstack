import { ProcessStateInterface } from './process-state.interface';
import { ZodType } from 'zod';
import { ServiceWithSchemaInterface } from './service-with-schema.interface';

export interface ToolInterface extends ServiceWithSchemaInterface{
  apply(
    props: any,
    target: ProcessStateInterface,
    source: ProcessStateInterface,
  ): Promise<ProcessStateInterface>;
}
