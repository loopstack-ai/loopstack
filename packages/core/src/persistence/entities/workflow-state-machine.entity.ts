import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkflowState } from './workflow-state.entity';
import { HistoryTransition } from '../interfaces/history-transition.interface';
import { WorkflowTransitionConfigInterface } from '@loopstack/shared';

@Entity()
export class WorkflowStateMachine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => WorkflowState, { onDelete: 'CASCADE' })
  @JoinColumn()
  workflowState: WorkflowState;

  @Column({ type: 'varchar' })
  place: string;

  @Column('jsonb', { nullable: false, default: [] })
  availableTransitions: WorkflowTransitionConfigInterface[];

  @Column('jsonb', { nullable: false, default: [] })
  transitionHistory: HistoryTransition[];
}
