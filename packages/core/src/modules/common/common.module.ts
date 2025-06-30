import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  SchemaValidatorService,
  ContextService,
  TemplateService, ObjectExpressionHandler, TemplateExpressionHandler, ExpressionEvaluatorService,
} from './services';
import { ClientMessageService } from './services/client-message.service';
import { SecureTemplateProcessor } from './services/expression-handler/secure-template-processor.service';
import { ConfigurationModule } from '../configuration';

@Module({
  imports: [
    ConfigurationModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [
    ClientMessageService,
    SchemaValidatorService,
    ContextService,
    TemplateService,
    ObjectExpressionHandler,
    TemplateExpressionHandler,
    ExpressionEvaluatorService,
    SecureTemplateProcessor,
  ],
  exports: [
    ClientMessageService,
    SchemaValidatorService,
    ContextService,
    TemplateService,
  ],
})
export class CommonModule {}
