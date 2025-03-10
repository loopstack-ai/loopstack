import { Module } from '@nestjs/common';
import { ProjectProcessorService } from './services';
import { ConfigurationModule } from '../configuration/configuration.module';
import { WorkflowProcessorService } from './services/workflow-processor.service';
import { ContextService } from './services/context.service';
import { ToolExecutionService } from './services/tool-execution.service';
import { TemplateEngineService } from './services/template-engine.service';
import { FunctionCallService } from './services/function-call.service';
import { ValueParserService } from './services/value-parser.service';
import { PersistenceModule } from '../persistence/persistence.module';
import { DiscoveryModule } from '@nestjs/core';
import { ToolRegistry } from './services/tool.registry';
import { ForwardChildContextTool } from './tools/forward-child-context.tool';
import { SetContextTool } from './tools/set-context.tool';
import { SetCustomOptionTool } from './tools/set-custom-option.tool';
import { AddNamespaceTool } from './tools/add-namespace.tool';
import { StateMachineValidatorRegistry } from './services/state-machine-validator.registry';
import { StateMachineActionRegistry } from './services/state-machine-action-registry.service';
import { StateMachineProcessorService } from './services/state-machine-processor.service';
import { StateMachineConfigService } from './services/state-machine-config.service';
import { TransitionManagerService } from './services/transition-manager.service';
import { StateMachineActionService } from './services/state-machine-action.service';
import { InitialRunValidator } from './validators/initial-run.validator';
import { WorkflowOptionValidator } from './validators/workflow-option.validator';
import { PromptAction } from './actions/prompt.action';
import { CreateDocumentAction } from './actions/create-document.action';
import { SchemaGeneratorService } from './services';
import { GenerateSchemasCommand } from './commands/generate-schemas.command';
import { LoadDocumentTool } from './tools/load-document.tool';

@Module({
  imports: [
    DiscoveryModule,
    ConfigurationModule,
    PersistenceModule,
  ],
  providers: [
    ProjectProcessorService,
    WorkflowProcessorService,
    ContextService,
    ToolExecutionService,
    TemplateEngineService,
    FunctionCallService,
    ValueParserService,
    SchemaGeneratorService,
    GenerateSchemasCommand,

    ToolRegistry,
    ForwardChildContextTool,
    SetContextTool,
    SetCustomOptionTool,
    AddNamespaceTool,
    LoadDocumentTool,

    StateMachineValidatorRegistry,
    StateMachineActionRegistry,
    StateMachineProcessorService,
    StateMachineConfigService,
    TransitionManagerService,
    StateMachineActionService,

    InitialRunValidator,
    WorkflowOptionValidator,

    PromptAction,
    CreateDocumentAction,
  ],
  exports: [
    ProjectProcessorService,
    SchemaGeneratorService,
  ],
})
export class ProcessorModule {}
