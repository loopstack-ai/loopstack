import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  SchemaValidatorService,
  FunctionCallService,
  TemplateEngineService,
  DocumentHelperService,
  ConfigValueParserService,
  ContextService,
} from './services';
import { ClientMessageService } from './services/client-message.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    ClientMessageService,
    FunctionCallService,
    SchemaValidatorService,
    TemplateEngineService,
    DocumentHelperService,
    ConfigValueParserService,
    ContextService,
  ],
  exports: [
    ClientMessageService,
    FunctionCallService,
    SchemaValidatorService,
    TemplateEngineService,
    DocumentHelperService,
    ConfigValueParserService,
    ContextService,
  ],
})
export class CommonModule {}
