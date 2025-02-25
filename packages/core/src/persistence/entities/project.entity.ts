import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectStatus } from '@loopstack/shared/dist/enums/project-status.enum';
import { NamespacesType } from '../../processor/interfaces/namespaces-type';
import { WorkspaceEntity } from './workspace.entity';
import { WorkflowEntity } from './workflow.entity';
import { DocumentEntity } from './document.entity';

@Entity({ name: 'project' })
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column('jsonb', { default: {} })
  namespaces: NamespacesType;

  @Column({ type: 'varchar' })
  title: string;

  @Column('jsonb', { default: [] })
  labels: string[];

  @Column({ default: 0 })
  order: number;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.New,
  })
  status: ProjectStatus;

  @Column('jsonb', { default: {} })
  context: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.projects, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'workspace_id' })
  workspace: WorkspaceEntity;

  @Column({ name: 'workspace_id', nullable: true })
  workspaceId: string;

  @OneToMany(() => WorkflowEntity, (workflow) => workflow.project)
  workflows: WorkflowEntity[];

  @OneToMany(
    () => DocumentEntity,
    (workflowDocument) => workflowDocument.project,
  )
  documents: DocumentEntity[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
