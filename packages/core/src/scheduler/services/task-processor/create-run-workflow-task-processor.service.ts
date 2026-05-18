import { Injectable, Logger } from '@nestjs/common';
import { CreateWorkflowService } from '../../../workflow-processor/services/create-workflow.service';
import { RootProcessorService } from '../../../workflow-processor/services/root-processor.service';

@Injectable()
export class CreateRunWorkflowTaskProcessorService {
  private readonly logger = new Logger(CreateRunWorkflowTaskProcessorService.name);

  constructor(
    private readonly createWorkflowService: CreateWorkflowService,
    private readonly rootProcessorService: RootProcessorService,
  ) {}
}
