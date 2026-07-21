import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Audit record of a single tool call — the raw args and response envelope, keyed by the
 * workflow run and the transition it happened in. Written by the core audit interceptor when
 * tool-call recording is enabled (debug mode); consumed for debugging and for deriving replay
 * fixtures (`loopstack runs <id> --record`).
 */
@Entity({ name: 'core_tool_call_record' })
export class ToolCallRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workflow_id' })
  @Index()
  workflowId!: string;

  @Column({ name: 'workspace_id' })
  @Index()
  workspaceId!: string;

  @Column({ type: 'varchar', name: 'transition_id', nullable: true })
  transitionId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  place!: string | null;

  /** Order of the call within its transition (0-based). */
  @Column({ type: 'int' })
  seq!: number;

  @Column({ name: 'tool_name' })
  toolName!: string;

  @Column('jsonb', { nullable: true })
  args!: Record<string, unknown> | null;

  @Column('jsonb')
  envelope!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
