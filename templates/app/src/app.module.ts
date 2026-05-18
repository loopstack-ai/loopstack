import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DefaultWorkspace } from './default.workspace';
import { DynamicRoutingExampleModule } from './dynamic-routing/dynamic-routing-example.module';
import { RunSubWorkflowExampleModule } from './run-sub-workflow-example/run-sub-workflow-example.module';

@Module({
  imports: [LoopstackModule.forRoot(), RunSubWorkflowExampleModule, DynamicRoutingExampleModule],
  controllers: [AppController],
  providers: [AppService, DefaultWorkspace],
})
export class AppModule {}
