import { Injectable, OnModuleInit } from '@nestjs/common';
import { SequenceProcessorService } from './processors/sequence-processor.service';
import { FactoryProcessorService } from './processors/factory-processor.service';
import { WorkflowProcessorService } from './processors/workflow-processor.service';
import { Processor } from '../../common';

@Injectable()
export class ProcessorFactory implements OnModuleInit {
  private processors = new Map<string, Processor>();

  constructor(
    // private sequenceProcessor: SequenceProcessorService,
    // private factoryProcessor: FactoryProcessorService,
    private workflowProcessorService: WorkflowProcessorService,
  ) {}

  onModuleInit() {
    // this.registerProcessor('sequence', this.sequenceProcessor);
    // this.registerProcessor('factory', this.factoryProcessor);
    this.registerProcessor('workflow', this.workflowProcessorService);
  }

  registerProcessor(type: string, processor: Processor) {
    this.processors.set(type, processor);
  }

  getProcessor(type: string): Processor | undefined {
    return this.processors.get(type);
  }
}
