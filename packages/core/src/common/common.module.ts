import { Module } from '@nestjs/common';
import { ActionHelperService, FunctionCallService, TemplateEngineService, DocumentHelperService } from './services';

@Module({
  providers: [
    FunctionCallService,
    ActionHelperService,
    TemplateEngineService,
    DocumentHelperService,
  ],
  exports: [
    FunctionCallService,
    ActionHelperService,
    TemplateEngineService,
    DocumentHelperService,
  ],
})
export class CommonModule {}
