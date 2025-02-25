import { Injectable } from '@nestjs/common';
import { ProcessRunInterface } from '../interfaces/process-run.interface';
import { ProjectProcessorService } from './project-processor.service';
import { ContextService } from './context.service';
import { ResultInterface } from '../interfaces/result.interface';

@Injectable()
export class ProcessorService {
  constructor(
    private projectProcessorService: ProjectProcessorService,
    private contextService: ContextService,
  ) {}

  process(config: any, payload: ProcessRunInterface): Promise<ResultInterface> {
    const context = this.contextService.create({
      ...payload,
      namespaces: {},
      transitions: [],
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
