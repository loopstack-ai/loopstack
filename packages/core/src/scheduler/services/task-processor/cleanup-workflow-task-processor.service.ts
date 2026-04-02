import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CleanupWorkflowTaskProcessorService {
  private readonly logger = new Logger(CleanupWorkflowTaskProcessorService.name);
}
