import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { ClaimMode, ClaimScope } from '../interfaces/index.js';

/**
 * One claim on one resource.
 *
 * No foreign keys to the workflow or the workspace, deliberately: a claim is reconciled against them on
 * every read (a claim whose scope target is terminal or gone is not a claim), and a cascade would delete the
 * row that a report wants to show as released. The ids are plain columns.
 */
@Entity({ name: 'resource_claim' })
// The live rows are the only ones ever queried, and always by one of these three.
@Index(['resourceKey'], { where: 'released_at IS NULL' })
@Index(['scopeWorkflowId'], { where: 'released_at IS NULL' })
@Index(['workspaceId'], { where: 'released_at IS NULL' })
// Belt and braces for the simplest invariant. Exclusive-against-shared and capacity both depend on the
// reconciliation join, so the claim transaction is what enforces those.
@Index(['resourceKey'], { unique: true, where: "released_at IS NULL AND mode = 'exclusive'" })
export class ResourceClaimEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The resource. Free-form and created on demand: `area:core`, `pkg:@loopstack/core`, `engineer:runs`. */
  @Column({ type: 'varchar', name: 'resource_key' })
  resourceKey!: string;

  @Column({ type: 'varchar' })
  mode!: ClaimMode;

  @Column({ type: 'varchar' })
  scope!: ClaimScope;

  /** The run whose life the claim follows; null for a workspace-scoped claim. */
  @Column({ type: 'uuid', name: 'scope_workflow_id', nullable: true })
  scopeWorkflowId!: string | null;

  /** The workspace the claim belongs to, and what a workspace-scoped claim follows. */
  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  /** The run that took it. For the report only — it releases nothing. */
  @Column({ type: 'uuid', name: 'claimed_by_workflow_id', nullable: true })
  claimedByWorkflowId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  label!: string | null;

  @CreateDateColumn({ name: 'claimed_at', type: 'timestamptz' })
  claimedAt!: Date;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt!: Date | null;
}
