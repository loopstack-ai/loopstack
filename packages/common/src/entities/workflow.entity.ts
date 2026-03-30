import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { WorkflowTransitionType } from '@loopstack/contracts/types';
import { WorkflowState } from '../enums';
import { DocumentEntity } from './document.entity';
import { PipelineEntity } from './pipeline.entity';
import { User } from './user.entity';

@Entity({ name: 'core_workflow' })
export class WorkflowEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'block_name' })
  @Index()
  blockName!: string;

  @Column({ type: 'varchar', nullable: true })
  title!: string;

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

  @Column({
    type: 'jsonb',
    name: 'result',
    nullable: true,
  })
  result!: Record<string, unknown> | null;

  @Column('jsonb', {
    name: 'available_transitions',
    nullable: true,
  })
  availableTransitions!: WorkflowTransitionType[] | null;

  @ManyToOne(() => PipelineEntity, (pipeline) => pipeline.workflows, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline!: PipelineEntity;

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

  @OneToMany(() => DocumentEntity, (document: DocumentEntity) => document.workflow, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  documents!: DocumentEntity[];

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator!: User;

  @Column({ name: 'created_by', type: 'uuid' })
  @Index()
  createdBy!: string;
}
