import { Module } from '@nestjs/common';
import { ProjectProcessorService } from './services/project-processor.service';
import { ConfigurationModule } from '../configuration/configuration.module';
import { WorkflowProcessorService } from './services/workflow-processor.service';
import { ContextService } from './services/context.service';
import { ToolsModule } from '../tools/tools.module';
import { ToolExecutionService } from './services/tool-execution.service';
import { TemplateEngineService } from './services/template-engine.service';
import { FunctionCallService } from './services/function-call.service';
import { ValueParserService } from './services/value-parser.service';
import { PersistenceModule } from '../persistence/persistence.module';
import { StateMachineModule } from '../state-machine/state-machine.module';

@Module({
  imports: [
    ConfigurationModule,
    PersistenceModule,
    ToolsModule,
    StateMachineModule,
  ],
  providers: [
    ProjectProcessorService,
    WorkflowProcessorService,
    ContextService,
    ToolExecutionService,
    TemplateEngineService,
    FunctionCallService,
    ValueParserService,
  ],
  exports: [ProjectProcessorService],
})
export class ProcessorModule {}
