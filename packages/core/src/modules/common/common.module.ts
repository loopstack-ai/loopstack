import { Module } from '@nestjs/common';
import {
  ActionHelperService,
  FunctionCallService,
  TemplateEngineService,
  DocumentHelperService,
  ConfigValueParserService,
  ContextService,
} from './services';

@Module({
  providers: [
    FunctionCallService,
    ActionHelperService,
    TemplateEngineService,
    DocumentHelperService,
    ConfigValueParserService,
    ContextService,
  ],
  exports: [
    FunctionCallService,
    ActionHelperService,
    TemplateEngineService,
    DocumentHelperService,
    ContextService,
  ],
})
export class CommonModule {}
