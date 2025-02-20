import { Module } from '@nestjs/common';
import {ProjectProcessorService} from "./services/project-processor.service";
import {ConfigurationModule} from "../configuration/configuration.module";
import {WorkflowProcessorService} from "./services/workflow-processor.service";
import {PipelineProcessorService} from "./services/pipeline-processor.service";

@Module({
  imports: [ConfigurationModule],
  providers: [
    ProjectProcessorService,
    WorkflowProcessorService,
    PipelineProcessorService],
  exports: [
    ProjectProcessorService,
  ],
})
export class ProcessorModule {}
