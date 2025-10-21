import { ProcessorFactory } from '../services';

export interface Processor {
  process(block: any, factory: ProcessorFactory): Promise<any>;
}
