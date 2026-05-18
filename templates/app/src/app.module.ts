import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DefaultWorkspace } from './default.workspace.js';
import { DynamicRoutingExampleModule } from './dynamic-routing/dynamic-routing-example.module.js';
import { RunSubWorkflowExampleModule } from './run-sub-workflow-example/run-sub-workflow-example.module.js';

@Module({
  imports: [LoopstackModule.forRoot(), RunSubWorkflowExampleModule, DynamicRoutingExampleModule],
  controllers: [AppController],
  providers: [AppService, DefaultWorkspace],
})
export class AppModule {}
