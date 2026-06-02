import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { z } from 'zod';
import { User } from './user.entity.js';
import { WorkflowEntity } from './workflow.entity.js';

@Entity({ name: 'core_document' })
export class DocumentEntity<T = any> {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'message_id' })
  @Index()
  messageId!: string;

  @Column({ type: 'varchar', name: 'alias' })
  @Index()
  alias!: string;

  @Column({ type: 'varchar', name: 'class_name', nullable: true })
  className!: string | null;

  @Column({ name: 'workspace_id' })
  @Index()
  workspaceId!: string;

  @Column('jsonb', { nullable: true })
  content!: T | null;

  @Column('jsonb', { nullable: true, name: 'validation_error' })
  error!: z.ZodError | null;

  @Column('varchar', { name: 'tags', array: true, nullable: true })
  tags!: string[];

  @Column('jsonb', { nullable: true })
  meta!: Record<string, any> | null;

  @Column({ name: 'is_invalidated', default: false })
  isInvalidated!: boolean;

  @Column({ name: 'is_pending_removal', default: false })
  isPendingRemoval!: boolean;

  @Column({ default: 1 })
  version!: number;

  @Column({ default: 0 })
  index!: number;

  @Column({ type: 'varchar', nullable: true })
  transition!: string | null;

  @Column({ type: 'varchar', nullable: true })
  place!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => WorkflowEntity, (state) => state.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflow_id' })
  workflow!: Relation<WorkflowEntity>;

  @Column('varchar', { name: 'labels', array: true, nullable: false })
  labels!: string[];

  @Column({ name: 'workflow_id', nullable: true })
  workflowId!: string;

  @ManyToMany(() => WorkflowEntity, (state) => state.dependencies, {
    onDelete: 'CASCADE',
  })
  dependentStates!: Relation<WorkflowEntity[]>;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator!: Relation<User>;

  @Column({ name: 'created_by', type: 'uuid' })
  @Index()
  createdBy!: string;
}
