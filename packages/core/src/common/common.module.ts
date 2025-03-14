import { Module } from '@nestjs/common';
import { ActionHelperService, FunctionCallService } from './services';

@Module({
  providers: [
    FunctionCallService,
    ActionHelperService,
  ],
  exports: [
    FunctionCallService,
    ActionHelperService,
  ],
})
export class CommonModule {}
