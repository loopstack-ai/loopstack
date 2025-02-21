import { Module } from '@nestjs/common';
import { ProjectProcessorService } from './services/project-processor.service';
import { ConfigurationModule } from '../configuration/configuration.module';
import { WorkflowProcessorService } from './services/workflow-processor.service';
import { ProcessorService } from './services/processor.service';
import { ContextService } from './services/context.service';
import { ToolsModule } from '../tools/tools.module';
import { FunctionCallService } from './services/function-call.service';
import { TemplateEngineService } from './services/template-engine.service';
import {GetterFunctionService} from "./services/getter-function.service";
import {ValueParserService} from "./services/value-parser.service";

@Module({
  imports: [ConfigurationModule, ToolsModule],
  providers: [
    ProjectProcessorService,
    WorkflowProcessorService,
    ProcessorService,
    ContextService,
    FunctionCallService,
    TemplateEngineService,
    GetterFunctionService,
    ValueParserService,
  ],
  exports: [ProcessorService],
})
export class ProcessorModule {}
