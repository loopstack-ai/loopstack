import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkflowEntity } from './workflow.entity';
import { StableJsonTransformer } from '../../utils/stable-json-transformer';
import { ContentTypesType } from '@loopstack/shared';

@Entity({ name: 'document' })
export class DocumentEntity<T = any> {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  @Index()
  name: string;

  @Column({ type: 'varchar' })
  @Index()
  type: string;

  @Column({ name: 'workspace_id' })
  @Index()
  workspaceId: string;

  @Column({ name: 'project_id' })
  @Index()
  projectId: string;

  @Column('jsonb', { nullable: true })
  contents: T | null;

  @Column({ name: 'content_type' })
  contentType: ContentTypesType;

  @Column({
    type: 'jsonb',
    transformer: new StableJsonTransformer(),
    name: 'schema',
    nullable: true,
  })
  schema: string;

  @Column('jsonb', { nullable: true })
  meta: Record<string, any> | null;

  @Column({ name: 'is_invalidated', default: false })
  isInvalidated: boolean;

  @Column({ name: 'is_pending_removal', default: false })
  isPendingRemoval: boolean;

  @Column('ltree', { name: 'workflow_index', default: '1' })
  workflowIndex: string;

  @Column({ default: 1 })
  version: number;

  @Column({ default: 0 })
  index: number;

  @Column({ type: 'varchar', nullable: true })
  transition: string | null;

  @Column({ type: 'varchar', nullable: true })
  place: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => WorkflowEntity, (state) => state.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflow_id' })
  workflow: WorkflowEntity;

  @Column('varchar', { name: 'labels', array: true, nullable: false })
  labels: string[];

  @Column({ name: 'workflow_id', nullable: true })
  workflowId: string;

  @ManyToMany(() => WorkflowEntity, (state) => state.dependencies, {
    onDelete: 'CASCADE',
  })
  dependentStates: WorkflowEntity[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
