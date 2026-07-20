import { Module } from '@nestjs/common';
import { HitlExamplesModule } from '@loopstack/hitl-examples';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { ObservabilityExamplesModule } from '@loopstack/observability-examples';
import { SecretsModule } from '@loopstack/secrets-module';
import { HelloModule } from './hello/hello.module';

@Module({
  imports: [
    LoopstackModule.forRoot(),
    HelloModule,
    HitlExamplesModule,
    SecretsModule,
    ObservabilityExamplesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
