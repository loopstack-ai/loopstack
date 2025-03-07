import { ProcessStateInterface } from './process-state.interface';

export interface ToolInterface {
  apply(
    options: any,
    target: ProcessStateInterface,
    source: ProcessStateInterface,
  ): Promise<ProcessStateInterface>;
}
