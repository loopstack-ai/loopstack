import { Module } from '@nestjs/common';
import { ActionHelperService, FunctionCallService } from './services';
import { TemplateEngineService } from './services/template-engine.service';

@Module({
  providers: [
    FunctionCallService,
    ActionHelperService,
    TemplateEngineService,
  ],
  exports: [
    FunctionCallService,
    ActionHelperService,
    TemplateEngineService,
  ],
})
export class CommonModule {}
