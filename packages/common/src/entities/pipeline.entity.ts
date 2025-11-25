import {
  Column,
  CreateDateColumn,
  Entity, Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkspaceEntity } from './workspace.entity';
import { NamespaceEntity } from './namespace.entity';
import { PipelineState } from '../enums';
import { StableJsonTransformer } from '../utils';
import { z } from 'zod';
import type { JSONSchemaConfigType } from '@loopstack/contracts/types';

@Entity({ name: 'core_pipeline' })
export class PipelineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'config_key' })
  @Index()
  configKey!: string;

  @Column({ type: 'varchar', nullable: true })
  title!: string | null;

  @Column({ default: 1 })
  run!: number;

  @Column('jsonb', { default: [] })
  labels!: string[];

  @Column('ltree', { default: '0001' })
  index!: string;

  @Column({
    type: 'enum',
    enum: PipelineState,
    default: 'pending',
  })
  status!: PipelineState;

  @Column('jsonb', { default: {} })
  args!: any;

  @Column('jsonb', { default: {} })
  context!: Record<string, any>;

  @Column({
    type: 'jsonb',
    transformer: new StableJsonTransformer(),
    name: 'schema',
    nullable: true,
  })
  schema!: JSONSchemaConfigType | null;

  @Column('jsonb', { nullable: true, name: "error" })
  error!: z.ZodError | null;

  @Column({
    type: 'jsonb',
    transformer: new StableJsonTransformer(),
    name: 'ui',
    nullable: true,
  })
  ui!: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.pipelines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({ name: 'workspace_id', nullable: true })
  workspaceId!: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @OneToMany(() => NamespaceEntity, (namespace) => namespace.pipeline)
  namespaces!: NamespaceEntity[];
}
