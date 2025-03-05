import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  ManyToMany,
  Unique, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { WorkflowEntity } from './workflow.entity';
import {ProjectEntity} from "./project.entity";

@Entity('namespace')
@Unique(['name', 'model', 'projectId'])
export class NamespaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column()
  @Index()
  model: string;

  @Column({ name: 'workspace_id' })
  @Index()
  workspaceId: string;

  @Column({ name: 'project_id' })
  @Index()
  projectId: string;

  @ManyToOne(() => NamespaceEntity, (namespace) => namespace.children, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent: NamespaceEntity;

  @Column({ name: 'parent_id', nullable: true })
  @Index()
  parentId: string | null;

  @Column('json', { nullable: true })
  metadata: Record<string, any> | null;

  @OneToMany(() => NamespaceEntity, (namespace) => namespace.parent)
  children: NamespaceEntity[];

  @OneToMany(() => WorkflowEntity, (workflow) => workflow.namespace, {
    onDelete: 'CASCADE',
  })
  workflows: WorkflowEntity[];

  @ManyToMany(() => ProjectEntity, (project) => project.namespaces)
  projects: ProjectEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
