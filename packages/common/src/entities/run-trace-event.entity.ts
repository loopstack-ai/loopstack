import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { RunTraceEvent } from '@loopstack/contracts/types';

/**
 * One persisted run-trace event — the DB projection of the in-memory `RunTraceEvent` stream.
 * Rows are written per `process()` call; heavy payload fields (tool args/envelopes, wait
 * payloads) are elided unless payload recording is enabled. Global order within a run is
 * `(createdAt, seq)` — `seq` restarts per processing call.
 */
@Entity({ name: 'core_run_trace_event' })
export class RunTraceEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workflow_id' })
  @Index()
  workflowId!: string;

  /** Registered name of the workflow — denormalized for join-free fixture derivation. */
  @Column({ name: 'workflow_name' })
  workflowName!: string;

  @Column({ name: 'workspace_id' })
  @Index()
  workspaceId!: string;

  /** The event's `seq` within its processing call. */
  @Column({ type: 'int' })
  seq!: number;

  @Column()
  type!: string;

  /** The full event (including `type`, `seq`, `ts`), payload fields possibly elided. */
  @Column('jsonb')
  payload!: RunTraceEvent;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
