import { Injectable } from '@nestjs/common';
import { ProcessRunInterface } from '../interfaces/process-run.interface';
import { ProjectProcessorService } from './project-processor.service';
import { ContextService } from './context.service';
import { ProcessStateInterface } from '../interfaces/process-state.interface';
import {ContextInterface} from "../interfaces/context.interface";

@Injectable()
export class ProcessorService {
  constructor(
    private projectProcessorService: ProjectProcessorService,
    private contextService: ContextService,
  ) {}

  process(config: any, payload: ProcessRunInterface): Promise<ContextInterface> {
    const context = this.contextService.create({
      ...payload,
      namespaces: {},
    });

    if (!config.projectName) {
      throw new Error(`No project name defined.`);
    }

    return this.projectProcessorService.processProject(
      config.projectName,
      context,
    );
  }
}
