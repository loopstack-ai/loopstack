import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { WorkflowEntity } from './workflow.entity';

@Entity({ name: 'core_workflow_checkpoint' })
export class WorkflowCheckpointEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => WorkflowEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflow_id' })
  workflow!: WorkflowEntity;

  @Column({ name: 'workflow_id' })
  @Index()
  workflowId!: string;

  @Column({ type: 'varchar' })
  place!: string;

  @Column({ type: 'varchar', name: 'transition_id', nullable: true })
  transitionId!: string | null;

  @Column({ type: 'varchar', name: 'transition_from', nullable: true })
  transitionFrom!: string | null;

  @Column('jsonb', { default: {} })
  state!: Record<string, unknown>;

  @Column('jsonb', { default: {} })
  tools!: Record<string, unknown>;

  @Column('uuid', { name: 'document_ids', array: true, default: '{}' })
  documentIds!: string[];

  @Column('uuid', { name: 'invalidated_document_ids', array: true, default: '{}' })
  invalidatedDocumentIds!: string[];

  @Column({ default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
