import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { WorkflowEntity } from './workflow.entity';
import { WorkspaceEntity } from './workspace.entity';

@Entity({ name: 'core_event_subscriber' })
@Index(['eventCorrelationId', 'eventName'])
@Index(['subscriberRootWorkflowId', 'subscriberWorkflowId', 'subscriberTransition'])
export class EventSubscriberEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => WorkflowEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriber_root_workflow_id' })
  subscriberRootWorkflow!: WorkflowEntity;

  @Column({ type: 'uuid', name: 'subscriber_root_workflow_id' })
  @Index()
  subscriberRootWorkflowId: string;

  @Column({ type: 'uuid', name: 'subscriber_workflow_id' })
  subscriberWorkflowId!: string;

  @Column({ type: 'varchar', name: 'subscriber_transition' })
  subscriberTransition!: string;

  @Column({ type: 'varchar', name: 'event_correlation_id' })
  @Index()
  eventCorrelationId!: string;

  @Column({ type: 'varchar', name: 'event_name' })
  @Index()
  eventName!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => WorkspaceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({ name: 'workspace_id', nullable: true })
  workspaceId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ name: 'once', type: 'boolean', default: true })
  once!: boolean;

  @Column('jsonb', { nullable: true })
  metadata!: Record<string, unknown> | null;
}
