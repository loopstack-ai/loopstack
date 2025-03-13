import { Module } from '@nestjs/common';
import { FunctionCallService } from './services';

@Module({
  providers: [
    FunctionCallService,
  ],
  exports: [
    FunctionCallService,
  ],
})
export class CommonModule {}
