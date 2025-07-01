import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  ContextService,
  TemplateService,
  ObjectExpressionHandler,
  TemplateExpressionHandler,
  SecureHandlebarsProcessor,
  DateFormatterHandlebarsHelperService,
  JsonStringifyHandlebarsHelperService, ValueHandlebarsHelperService,
} from './services';
import { ClientMessageService } from './services/client-message.service';
import { ConfigurationModule } from '../configuration';

@Module({
  imports: [
    ConfigurationModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [
    ClientMessageService,
    ContextService,
    TemplateService,
    ObjectExpressionHandler,
    TemplateExpressionHandler,
    SecureHandlebarsProcessor,
    DateFormatterHandlebarsHelperService,
    JsonStringifyHandlebarsHelperService,
    ValueHandlebarsHelperService,
  ],
  exports: [
    ClientMessageService,
    ContextService,
    TemplateService,
  ],
})
export class CommonModule {}
