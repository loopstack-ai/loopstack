/**
 * How long a claim survives.
 *
 * It is declared rather than inferred from who took it, because the two come apart: a run may take a claim
 * meant to outlive it, and releasing that when the run ends would free a resource still in use.
 *
 * @public
 */
export type ClaimScope = 'workflow' | 'workspace';

/**
 * Whether a claim admits others.
 *
 * `exclusive` admits no other holder of the resource, of either mode. `shared` coexists with other shared
 * holders up to the resource's capacity. The two together are a reader/writer lock; a resource with the
 * default capacity of one and exclusive claims is a plain mutex.
 *
 * @public
 */
export type ClaimMode = 'exclusive' | 'shared';

/**
 * One resource a claim request asks for.
 *
 * @public
 */
export interface RequestedResource {
  key: string;
  mode: ClaimMode;
  scope: ClaimScope;
  /** The workspace the claim belongs to, and what a `workspace`-scoped claim follows. Always required. */
  workspaceId: string;
  /** The run whose life the claim follows. Required for `scope: 'workflow'`, ignored otherwise. */
  scopeWorkflowId?: string;
}

/**
 * A request for one or more resources, taken as a whole.
 *
 * The list may mix scopes, which is the point: one decision can take a unit of a pool for a workspace and a
 * set of areas for a run, and either both hold or neither does.
 *
 * @public
 */
export interface ClaimRequest {
  resources: RequestedResource[];
  /** The run that took it. Recorded for the report; it releases nothing. */
  claimedByWorkflowId?: string;
  /** Human text for the report — a ticket reference, a base key. Never read by the module. */
  label?: string;
}

/**
 * A live claim, as a reader sees it.
 *
 * @public
 */
export interface ClaimHolder {
  claimId: string;
  key: string;
  mode: ClaimMode;
  scope: ClaimScope;
  workspaceId: string;
  scopeWorkflowId?: string;
  claimedByWorkflowId?: string;
  label?: string;
  since: Date;
}

/**
 * A resource a request could not have, with what holds it.
 *
 * @public
 */
export interface ClaimBlocker {
  key: string;
  /** `null` is unlimited. */
  capacity: number | null;
  /** Why it could not be taken, in one line, for a card or a log. */
  reason: string;
  holders: ClaimHolder[];
}

/**
 * The outcome of a {@link ClaimRequest}: every resource, or none of them.
 *
 * @public
 */
export type ClaimResult = { claimed: true; claims: ClaimHolder[] } | { claimed: false; blocked: ClaimBlocker[] };

/**
 * What a resource looks like right now.
 *
 * @public
 */
export interface ResourceState {
  key: string;
  /** `null` is unlimited. */
  capacity: number | null;
  holders: ClaimHolder[];
  /** Units left for a shared claim; `null` when the capacity is unlimited. Zero while held exclusively. */
  free: number | null;
}

/** What a release names. At least one field must be set. */
export interface ReleaseTarget {
  claimIds?: string[];
  /** Every claim scoped to this run. */
  scopeWorkflowId?: string;
  /** Every claim of this workspace, of either scope. */
  workspaceId?: string;
}
