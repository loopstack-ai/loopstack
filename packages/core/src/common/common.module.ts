import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  TemplateService,
  ObjectExpressionHandler,
  TemplateExpressionHandler,
  DateFormatterHelperService,
  HandlebarsProcessor,
  OperatorsHelperService,
  TemplateExpressionEvaluatorService,
} from './services';
import { ClientMessageService } from './services/client-message.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot()
  ],
  providers: [
    ClientMessageService,
    TemplateService,
    ObjectExpressionHandler,
    TemplateExpressionHandler,
    HandlebarsProcessor,
    DateFormatterHelperService,
    OperatorsHelperService,
    TemplateExpressionEvaluatorService,
  ],
  exports: [ClientMessageService, TemplateExpressionEvaluatorService],
})
export class CommonModule {}
