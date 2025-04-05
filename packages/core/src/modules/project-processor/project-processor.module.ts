import { Module } from '@nestjs/common';
import { ProjectProcessorService } from './services';
import { WorkflowProcessorModule } from '../workflow-processor/workflow-processor.module';
import { ConfigurationModule } from '../configuration';
import { PersistenceModule } from '../persistence/persistence.module';
import { CommonModule } from '../common';

@Module({
  imports: [
    CommonModule,
    ConfigurationModule,
    PersistenceModule,
    WorkflowProcessorModule,
  ],
  providers: [ProjectProcessorService],
  exports: [ProjectProcessorService],
})
export class ProjectProcessorModule {}
