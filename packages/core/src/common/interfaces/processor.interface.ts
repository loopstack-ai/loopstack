import { ProcessorFactory } from '../../workflow-processor';

export interface Processor {
  process(block: any, factory: ProcessorFactory): Promise<any>;
}
