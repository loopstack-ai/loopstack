import { ProcessStateInterface } from '../../processor/interfaces/process-state.interface';

export interface ToolInterface {
  apply(
    options: any,
    target: ProcessStateInterface,
    source: ProcessStateInterface,
  ): ProcessStateInterface;
}
