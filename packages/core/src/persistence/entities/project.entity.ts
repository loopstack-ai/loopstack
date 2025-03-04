import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn, JoinTable, ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectStatus } from '@loopstack/shared';
import { WorkspaceEntity } from './workspace.entity';
import { WorkflowEntity } from './workflow.entity';
import {NamespaceEntity} from "./namespace.entity";

@Entity({ name: 'project' })
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column('jsonb', { default: [] })
  labels: string[];

  @Column({ default: 0 })
  order: number;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: 'new',
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
  })
  @JoinColumn({ name: 'workspace_id' })
  workspace: WorkspaceEntity;

  @Column({ name: 'workspace_id', nullable: true })
  workspaceId: string;

  @OneToMany(() => WorkflowEntity, (workflow) => workflow.project)
  workflows: WorkflowEntity[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToMany(() => NamespaceEntity, (namespace) => namespace.projects)
  @JoinTable({
    name: 'project_namespace',
    joinColumn: {
      name: 'project_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'namespace_id',
      referencedColumnName: 'id',
    },
  })
  namespaces: NamespaceEntity[];

  @Column('uuid', { name: 'namespace_ids', array: true, nullable: false })
  namespaceIds: string[];

  @BeforeInsert()
  setNamespaceIds() {
    this.namespaceIds = this.namespaces?.map(ns => ns.id) || [];
  }
}
