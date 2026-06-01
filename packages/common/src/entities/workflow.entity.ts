import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import type { WorkflowTransitionType } from '@loopstack/contracts/types';
import { WorkflowState } from '../enums/index.js';
import { DocumentEntity } from './document.entity.js';
import { User } from './user.entity.js';
import { WorkspaceEntity } from './workspace.entity.js';

@Entity({ name: 'core_workflow' })
export class WorkflowEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'workflow_name' })
  @Index()
  workflowName!: string;

  @Column({ type: 'varchar', name: 'class_name', nullable: true })
  className!: string | null;

  @Column({ type: 'varchar', nullable: true })
  title!: string;

  @Column({ default: 1 })
  run!: number;

  @Column({
    type: 'enum',
    enum: WorkflowState,
    default: 'pending',
  })
  status!: WorkflowState;

  @Column({ default: false })
  hasError!: boolean;

  @Column({ type: 'varchar', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'varchar', name: 'retry_transition_id', nullable: true })
  retryTransitionId!: string | null;

  @Column({ type: 'varchar', name: 'callback_transition', nullable: true })
  callbackTransition!: string | null;

  @Column('jsonb', { name: 'callback_metadata', nullable: true })
  callbackMetadata!: Record<string, unknown> | null;

  @Column('jsonb', { default: {} })
  args!: any;

  @Column('jsonb', { nullable: true })
  config!: Record<string, unknown> | null;

  @Column('jsonb', { default: {} })
  context!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'varchar', default: 'start' })
  place!: string;

  @Column({
    type: 'jsonb',
    name: 'result',
    nullable: true,
  })
  result!: Record<string, unknown> | null;

  @Column('jsonb', {
    name: 'available_transitions',
    nullable: true,
  })
  availableTransitions!: WorkflowTransitionType[] | null;

  @Column('varchar', { name: 'labels', array: true, default: [] })
  labels!: string[];

  @ManyToMany(() => DocumentEntity, (document) => document.dependentStates, {
    onDelete: 'CASCADE',
  })
  @JoinTable({
    name: 'core_workflow_document',
    joinColumn: {
      name: 'workflow_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'document_id',
      referencedColumnName: 'id',
    },
  })
  dependencies!: Relation<DocumentEntity[]>;

  @Column('jsonb', { name: 'hash_record', nullable: true })
  hashRecord!: Record<string, string | null> | null;

  @OneToMany(() => DocumentEntity, (document: DocumentEntity) => document.workflow, {
    onDelete: 'CASCADE',
  })
  documents!: Relation<DocumentEntity[]>;

  @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.workflows, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: Relation<WorkspaceEntity>;

  @Column({ name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator!: Relation<User>;

  @Column({ name: 'created_by', type: 'uuid' })
  @Index()
  createdBy!: string;

  @ManyToOne(() => WorkflowEntity, (workflow) => workflow.children, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: Relation<WorkflowEntity> | null;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  @OneToMany(() => WorkflowEntity, (workflow) => workflow.parent)
  children!: Relation<WorkflowEntity[]>;
}
