import {
  Column,
  CreateDateColumn,
  Entity, Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentEntity } from './document.entity';
import { NamespaceEntity } from './namespace.entity';
import { WorkflowState } from '../enums';
import { TransitionResultLookup } from '../interfaces';
import { StableJsonTransformer } from '../utils';
import { z } from 'zod';
import type { HistoryTransition, JSONSchemaConfigType, UiFormType, WorkflowTransitionType } from '@loopstack/contracts/types';

@Entity({ name: 'core_workflow' })
export class WorkflowEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'block_name' })
  @Index()
  blockName!: string;

  @Column({ type: 'varchar', nullable: true })
  title!: string;

  @Column('ltree', { default: '1' })
  index!: string;

  @Column({ default: 0 })
  progress!: number;

  @Column({
    type: 'enum',
    enum: WorkflowState,
    default: 'pending',
  })
  status!: WorkflowState;

  @Column({ default: false })
  hasError!: boolean;

  @Column({ type: 'varchar', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'varchar' })
  place!: string;

  @Column('jsonb', {
    name: 'transition_results',
    nullable: true,
  })
  transitionResults!: TransitionResultLookup | null;

  @Column('jsonb', {
    name: 'input_data',
    default: {},
  })
  inputData!: Record<string, any>;

  @Column('jsonb', {
    name: 'available_transitions',
    nullable: true,
  })
  availableTransitions!: WorkflowTransitionType[] | null;

  @Column('jsonb', { name: 'history', nullable: true })
  history!: HistoryTransition[] | null;

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
  ui!: UiFormType | null;

  @ManyToOne(() => NamespaceEntity, (namespace) => namespace.workflows, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'namespace_id' })
  namespace!: NamespaceEntity;

  @Column({ name: 'namespace_id' })
  namespaceId!: string;

  @Column({ name: 'pipeline_id' })
  pipelineId!: string;

  @Column('varchar', { name: 'labels', array: true, default: [] })
  labels!: string[];

  @ManyToMany(() => DocumentEntity, (document) => document.dependentStates, {
    onDelete: 'CASCADE',
  })
  @JoinTable({
    name: 'core_workflow_document',
    joinColumn: {
      name: 'workflow_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'document_id',
      referencedColumnName: 'id',
    },
  })
  dependencies!: DocumentEntity[];

  @Column('jsonb', { name: 'hash_record', nullable: true })
  hashRecord!: Record<string, string | null> | null;

  @OneToMany(
    () => DocumentEntity,
    (document: DocumentEntity) => document.workflow,
    {
      cascade: true,
      onDelete: 'CASCADE',
    },
  )
  documents!: DocumentEntity[];

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;
}
