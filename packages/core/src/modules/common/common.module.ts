import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  SchemaValidatorService,
  ContextService,
  TemplateService, ObjectExpressionHandler, TemplateExpressionHandler, ExpressionEvaluatorService,
} from './services';
import { ClientMessageService } from './services/client-message.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    ClientMessageService,
    SchemaValidatorService,
    ContextService,
    TemplateService,
    ObjectExpressionHandler,
    TemplateExpressionHandler,
    ExpressionEvaluatorService,
  ],
  exports: [
    ClientMessageService,
    SchemaValidatorService,
    ContextService,
    TemplateService,
  ],
})
export class CommonModule {}
