import { Module } from '@nestjs/common';
import { HitlExamplesModule } from '@loopstack/hitl-examples';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { HelloModule } from './hello/hello.module';

@Module({
  imports: [LoopstackModule.forRoot(), HelloModule, HitlExamplesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
