import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HistoryTransition } from '../interfaces/history-transition.interface';
import { WorkflowTransitionConfigInterface } from '@loopstack/shared';
import { WorkflowEntity } from './workflow.entity';

@Entity({ name: 'workflow_state' })
export class WorkflowStateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  place: string;

  @Column('jsonb', {
    name: 'available_transitions',
    nullable: false,
    default: [],
  })
  availableTransitions: WorkflowTransitionConfigInterface[];

  @Column('jsonb', { name: 'transition_history', nullable: false, default: [] })
  transitionHistory: HistoryTransition[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => WorkflowEntity, {
    cascade: true,
    nullable: false,
  })
  workflowState: WorkflowEntity;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
