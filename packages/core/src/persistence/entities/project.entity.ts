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
import { ProjectStatus } from '@loopstack/shared';
import { WorkspaceEntity } from './workspace.entity';
import { NamespaceEntity } from './namespace.entity';

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

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @OneToMany(() => NamespaceEntity, (namespace) => namespace.project)
  namespaces: NamespaceEntity[];
}
