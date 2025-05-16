import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  SchemaValidatorService,
  ExpressionEvaluatorService,
  TemplateEngineService,
  DocumentHelperService,
  ValueParserService,
  ContextService,
} from './services';
import { ClientMessageService } from './services/client-message.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    ClientMessageService,
    ExpressionEvaluatorService,
    SchemaValidatorService,
    TemplateEngineService,
    DocumentHelperService,
    ValueParserService,
    ContextService,
  ],
  exports: [
    ClientMessageService,
    ExpressionEvaluatorService,
    SchemaValidatorService,
    TemplateEngineService,
    DocumentHelperService,
    ValueParserService,
    ContextService,
  ],
})
export class CommonModule {}
