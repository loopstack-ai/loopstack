import { Module } from '@nestjs/common';
import { ProjectProcessorService } from './services/project-processor.service';
import { ConfigurationModule } from '../configuration/configuration.module';
import { WorkflowProcessorService } from './services/workflow-processor.service';
import { PipelineProcessorService } from './services/pipeline-processor.service';
import { ProcessorService } from './services/processor.service';
import { ContextService } from './services/context.service';
import { ToolsModule } from '../tools/tools.module';
import { FunctionCallService } from './services/function-call.service';
import { TemplateEngineService } from './services/template-engine.service';

@Module({
  imports: [ConfigurationModule, ToolsModule],
  providers: [
    ProjectProcessorService,
    WorkflowProcessorService,
    PipelineProcessorService,
    ProcessorService,
    ContextService,
    FunctionCallService,
    TemplateEngineService,
  ],
  exports: [ProcessorService],
})
export class ProcessorModule {}
