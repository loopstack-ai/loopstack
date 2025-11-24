import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkflowEntity } from './workflow.entity';
import { PipelineEntity } from './pipeline.entity';

@Entity('core_namespace')
export class NamespaceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => PipelineEntity, (pipeline) => pipeline.namespaces, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline!: PipelineEntity;

  @Column({ name: 'pipeline_id' })
  pipelineId!: string;

  @ManyToOne(() => NamespaceEntity, (namespace) => namespace.children, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: NamespaceEntity;

  @Column({ name: 'parent_id', nullable: true })
  @Index()
  parentId!: string | null;

  @Column('json', { nullable: true })
  metadata!: Record<string, any> | null;

  @OneToMany(() => NamespaceEntity, (namespace) => namespace.parent, {
    onDelete: 'CASCADE',
  })
  children!: NamespaceEntity[];

  @OneToMany(() => WorkflowEntity, (workflow) => workflow.namespace, {
    onDelete: 'CASCADE',
  })
  workflows!: WorkflowEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;
}
