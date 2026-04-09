import { Injectable, Logger } from '@nestjs/common';
import { CreateWorkflowService, RootProcessorService } from '../../../workflow-processor';

@Injectable()
export class CreateRunWorkflowTaskProcessorService {
  private readonly logger = new Logger(CreateRunWorkflowTaskProcessorService.name);

  constructor(
    private readonly createWorkflowService: CreateWorkflowService,
    private readonly rootProcessorService: RootProcessorService,
  ) {}
}
