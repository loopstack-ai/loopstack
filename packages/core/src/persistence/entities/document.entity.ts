import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NamespacesType } from '../../processor/interfaces/namespaces-type';
import { ProjectEntity } from './project.entity';
import { WorkspaceEntity } from './workspace.entity';
import { WorkflowEntity } from './workflow.entity';

@Entity({ name: 'document' })
export class DocumentEntity<T = any> {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  type: string;

  @Column('jsonb', { nullable: true })
  contents: T | null;

  @Column({ name: 'is_json_serialized', default: false })
  isJsonSerialized: boolean;

  @Column('jsonb', { nullable: true })
  meta: Record<string, any> | null;

  @Column('jsonb', { nullable: false, default: {} })
  namespaces: NamespacesType;

  @Column({ name: 'is_invalidated', default: false })
  isInvalidated: boolean;

  @Column({ name: 'is_pending_removal', default: false })
  isPendingRemoval: boolean;

  @Column({ name: 'creators_index', default: 0 })
  creatorsIndex: number;

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

  @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.documents, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'workspace_id' })
  workspace: WorkspaceEntity;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @ManyToOne(() => ProjectEntity, (project) => project.documents, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => WorkflowEntity, (state) => state.documents, {
    // nullable: true,
    // onDelete: 'SET NULL', // todo verify that cascade works
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'workflow_id' })
  workflow: WorkflowEntity;

  @Column({ name: 'workflow_id' })
  workflowId: string;

  @ManyToMany(() => WorkflowEntity, (state) => state.dependencies)
  @JoinTable({
    name: 'workflow_document',
    joinColumn: {
      name: 'document_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'workflow_id',
      referencedColumnName: 'id',
    },
  })
  dependentStates: WorkflowEntity[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
