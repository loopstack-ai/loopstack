import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PipelineState } from '../enums';
import { User } from './user.entity';
import { WorkflowEntity } from './workflow.entity';
import { WorkspaceEntity } from './workspace.entity';

@Entity({ name: 'core_pipeline' })
export class PipelineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'block_name' })
  @Index()
  blockName!: string;

  @Column({ type: 'varchar', nullable: true })
  title!: string | null;

  @Column({ default: 1 })
  run!: number;

  @Column('jsonb', { default: [] })
  labels!: string[];

  @Column({
    type: 'enum',
    enum: PipelineState,
    default: 'pending',
  })
  status!: PipelineState;

  @Column({ type: 'varchar', name: 'event_correlation_id', nullable: true })
  eventCorrelationId!: string | null;

  @Column('jsonb', { default: {} })
  args!: any;

  @Column('jsonb', { default: {} })
  context!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.pipelines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({ name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator!: User;

  @Column({ name: 'created_by', type: 'uuid' })
  @Index()
  createdBy!: string;

  @OneToMany(() => WorkflowEntity, (workflow) => workflow.pipeline)
  workflows!: WorkflowEntity[];

  @ManyToOne(() => PipelineEntity, (pipeline) => pipeline.children, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: PipelineEntity | null;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  @OneToMany(() => PipelineEntity, (pipeline) => pipeline.parent)
  children!: PipelineEntity[];
}
