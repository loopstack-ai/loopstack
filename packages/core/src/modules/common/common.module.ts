import { Module } from '@nestjs/common';
import {
  SchemaValidatorService,
  FunctionCallService,
  TemplateEngineService,
  DocumentHelperService,
  ConfigValueParserService,
  ContextService,
} from './services';

@Module({
  providers: [
    FunctionCallService,
    SchemaValidatorService,
    TemplateEngineService,
    DocumentHelperService,
    ConfigValueParserService,
    ContextService,
  ],
  exports: [
    FunctionCallService,
    SchemaValidatorService,
    TemplateEngineService,
    DocumentHelperService,
    ConfigValueParserService,
    ContextService,
  ],
})
export class CommonModule {}
