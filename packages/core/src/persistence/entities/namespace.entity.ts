import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  ManyToMany,
  Unique,
} from 'typeorm';
import { WorkflowEntity } from './workflow.entity';

@Entity('namespace')
@Unique(['name', 'model', 'workspaceId'])
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

  @ManyToMany(() => WorkflowEntity, (workflow) => workflow.namespaces, {
    onDelete: 'CASCADE',
  })
  workflows: WorkflowEntity[];

  @ManyToMany(() => WorkflowEntity, (workflow) => workflow.namespaces)
  projects: WorkflowEntity[];
}
