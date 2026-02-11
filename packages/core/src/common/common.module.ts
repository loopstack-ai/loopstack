import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  DateFormatterHelperService,
  HandlebarsProcessor,
  JexlExpressionHandler,
  ObjectExpressionHandler,
  OperatorsHelperService,
  TemplateExpressionEvaluatorService,
  TemplateExpressionHandler,
  TemplateService,
} from './services';
import { ClientMessageService } from './services/client-message.service';

@Module({
  imports: [ConfigModule, EventEmitterModule.forRoot()],
  providers: [
    ClientMessageService,
    TemplateService,
    ObjectExpressionHandler,
    JexlExpressionHandler,
    TemplateExpressionHandler,
    HandlebarsProcessor,
    DateFormatterHelperService,
    OperatorsHelperService,
    TemplateExpressionEvaluatorService,
  ],
  exports: [ClientMessageService, TemplateExpressionEvaluatorService],
})
export class CommonModule {}
