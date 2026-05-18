import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { DefaultModule } from './default.module';

@Module({
  imports: [
    LoopstackModule.forRoot(),

    // Custom Workflow Modules:
    DefaultModule,
  ],
})
export class AppModule {}
