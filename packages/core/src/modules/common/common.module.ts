import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  TemplateService,
  ObjectExpressionHandler,
  TemplateExpressionHandler,
  DateFormatterHelperService,
  HandlebarsProcessor,
  OperatorsHelperService,
} from './services';
import { ClientMessageService } from './services/client-message.service';
import { ConfigurationModule } from '../configuration';

@Module({
  imports: [ConfigurationModule, EventEmitterModule.forRoot()],
  providers: [
    ClientMessageService,
    TemplateService,
    ObjectExpressionHandler,
    TemplateExpressionHandler,
    HandlebarsProcessor,
    DateFormatterHelperService,
    OperatorsHelperService,
  ],
  exports: [ClientMessageService, TemplateService],
})
export class CommonModule {}
