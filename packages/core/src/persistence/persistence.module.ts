import { Module } from '@nestjs/common';
import { WorkflowState } from './entities/workflow-state.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowStateService } from './services/workflow-state.service';
import { WorkflowStateMachine } from './entities/workflow-state-machine.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowState, WorkflowStateMachine])],
  providers: [WorkflowStateService],
  exports: [WorkflowStateService],
})
export class PersistenceModule {}
