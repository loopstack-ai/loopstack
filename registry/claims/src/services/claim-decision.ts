import type { ClaimBlocker, ClaimHolder, RequestedResource } from '../interfaces/index.js';

/** The capacity of a resource: a number of shared holders, or `null` for unlimited. */
export type CapacityLookup = (key: string) => number | null;

/** What a claim request resolves to, before anything is written. */
export interface ClaimDecision {
  /** Resources the requester already holds for the same scope target — nothing to insert. */
  held: RequestedResource[];
  /** Resources to insert. */
  grant: RequestedResource[];
  /** Resources it cannot have. Non-empty means the whole request fails. */
  blocked: ClaimBlocker[];
}

/**
 * What a claim is scoped to, as a single comparable value: the run for a `workflow` claim, the workspace for
 * a `workspace` one. Two claims with the same key and the same scope target are the same claim.
 */
export function scopeTargetOf(claim: { scope: string; workspaceId: string; scopeWorkflowId?: string | null }): string {
  return claim.scope === 'workflow' ? `workflow:${claim.scopeWorkflowId}` : `workspace:${claim.workspaceId}`;
}

/**
 * Decide a whole claim request against the resources' live claims.
 *
 * Pure, and the only place the rules live. Three of them:
 *
 * - **Idempotence.** A resource the requester already holds for the same scope target, in the same mode, is
 *   reported as `held` and nothing is written. That is what lets the fleet claim a run's areas at dispatch
 *   and the run claim them again at startup without either needing to know about the other. The same mode is
 *   part of it: a holder asking for a *different* mode is asking to change the claim, which is not a thing
 *   this does, and it is blocked by its own claim so the caller sees why.
 * - **Exclusive** admits no other holder of the resource, in either mode, whatever the capacity.
 * - **Shared** admits others up to the capacity, and never beside an exclusive holder.
 *
 * Resources granted earlier in the same request count against the ones after them, so a request that asks
 * for the same exclusive key for two different targets fails rather than contradicting itself.
 */
export function decideClaims(
  requested: readonly RequestedResource[],
  live: readonly ClaimHolder[],
  capacityOf: CapacityLookup,
): ClaimDecision {
  const held: RequestedResource[] = [];
  const grant: RequestedResource[] = [];
  const blocked: ClaimBlocker[] = [];
  // Live claims plus what this request has granted so far — one request must not contradict itself.
  const taken: ClaimHolder[] = [...live];

  for (const resource of requested) {
    if (resource.scope === 'workflow' && !resource.scopeWorkflowId) {
      throw new Error(`A workflow-scoped claim on '${resource.key}' needs a scopeWorkflowId.`);
    }
    const capacity = capacityOf(resource.key);
    const target = scopeTargetOf(resource);
    const holders = taken.filter((holder) => holder.key === resource.key);
    const mine = holders.find((holder) => scopeTargetOf(holder) === target);

    if (mine) {
      if (mine.mode === resource.mode) {
        held.push(resource);
        continue;
      }
      blocked.push({
        key: resource.key,
        capacity,
        reason: `already held by the same owner as ${mine.mode}; a claim's mode cannot be changed`,
        holders: [mine],
      });
      continue;
    }

    const others = holders;
    const exclusiveHolder = others.find((holder) => holder.mode === 'exclusive');
    if (exclusiveHolder) {
      blocked.push({ key: resource.key, capacity, reason: 'held exclusively', holders: others });
      continue;
    }
    if (resource.mode === 'exclusive' && others.length) {
      blocked.push({
        key: resource.key,
        capacity,
        reason: `wanted exclusively, but ${others.length} holder(s) have it`,
        holders: others,
      });
      continue;
    }
    if (resource.mode === 'shared' && capacity !== null && others.length + 1 > capacity) {
      blocked.push({
        key: resource.key,
        capacity,
        reason: `at capacity (${others.length} of ${capacity})`,
        holders: others,
      });
      continue;
    }

    grant.push(resource);
    taken.push(asHolder(resource));
  }

  return { held, grant, blocked };
}

/** A resource this request has granted, in the shape the rules compare against. */
function asHolder(resource: RequestedResource): ClaimHolder {
  return {
    claimId: 'pending',
    key: resource.key,
    mode: resource.mode,
    scope: resource.scope,
    workspaceId: resource.workspaceId,
    ...(resource.scopeWorkflowId ? { scopeWorkflowId: resource.scopeWorkflowId } : {}),
    since: new Date(0),
  };
}

/**
 * How many shared units a resource has left: `null` when the capacity is unlimited, and zero while an
 * exclusive holder has it however large the capacity.
 */
export function freeUnits(holders: readonly ClaimHolder[], capacity: number | null): number | null {
  if (holders.some((holder) => holder.mode === 'exclusive')) return 0;
  if (capacity === null) return null;
  return Math.max(0, capacity - holders.length);
}
