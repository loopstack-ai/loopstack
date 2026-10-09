import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, In, IsNull, Repository } from 'typeorm';
import { CLAIMS_MODULE_CONFIG, type ClaimsModuleConfig, DEFAULT_CAPACITY } from '../claims.constants.js';
import { ResourceClaimEntity } from '../entities/index.js';
import type {
  ClaimHolder,
  ClaimRequest,
  ClaimResult,
  ReleaseTarget,
  RequestedResource,
  ResourceState,
} from '../interfaces/index.js';
import { type CapacityLookup, decideClaims, freeUnits } from './claim-decision.js';

/** The states a run does not leave on its own — a claim scoped to one of these is not a claim. */
const TERMINAL_STATES = ['completed', 'failed', 'canceled'];

/**
 * Takes, reports and releases claims on resources.
 *
 * **Claiming never waits.** There is no blocking acquire: a task that waits inside its transition holds a
 * queue slot and its workspace lock while doing nothing. `claim` either succeeds now or says what blocked
 * it, and the caller decides whether to hold back, park and try later, or report it. Fairness and ordering
 * belong to the caller, where the policy is.
 *
 * **A claim cannot be left behind.** Every read reconciles against the scope target — a claim scoped to a
 * run that has settled or been deleted, or to a workspace that is gone, is ignored. So a crashed holder, a
 * cascade delete that emitted no event, a missed event and a process that died between claiming and
 * releasing all free the resource by themselves. The listeners that release on `workflow.settled` and the
 * deletion events only keep the table tidy; correctness does not depend on them arriving.
 *
 * @public
 */
@Injectable()
export class ResourceClaimService {
  private readonly logger = new Logger(ResourceClaimService.name);
  private readonly capacities: Map<string, number | null>;

  constructor(
    @InjectRepository(ResourceClaimEntity) private readonly claims: Repository<ResourceClaimEntity>,
    private readonly dataSource: DataSource,
    @Inject(CLAIMS_MODULE_CONFIG) config: ClaimsModuleConfig,
  ) {
    // `null` is a value here — unlimited — so an absent `capacity` is the only thing that means the default.
    this.capacities = new Map(
      (config.resources ?? []).map((resource) => [
        resource.key,
        resource.capacity === undefined ? DEFAULT_CAPACITY : resource.capacity,
      ]),
    );
  }

  /** The configured capacity of a resource, or {@link DEFAULT_CAPACITY} for a key nothing declared. */
  capacityOf: CapacityLookup = (key: string) => {
    const configured = this.capacities.get(key);
    return configured === undefined ? DEFAULT_CAPACITY : configured;
  };

  /**
   * Take every resource in the request, or none of them.
   *
   * One transaction, with an advisory lock per resource key taken in sorted order — sorted because two
   * multi-key requests locking in different orders would deadlock each other. The lock is released when the
   * transaction commits, so there is no lock table to keep and nothing to clean up after a crash.
   */
  async claim(request: ClaimRequest): Promise<ClaimResult> {
    if (!request.resources.length) return { claimed: true, claims: [] };
    const keys = [...new Set(request.resources.map((resource) => resource.key))].sort();

    return this.dataSource.transaction(async (manager) => {
      for (const key of keys) {
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
      }
      const live = await this.liveClaims(keys, manager);
      const decision = decideClaims(request.resources, live, this.capacityOf);

      if (decision.blocked.length) {
        return { claimed: false, blocked: decision.blocked };
      }

      const inserted = decision.grant.length
        ? await manager.save(
            ResourceClaimEntity,
            decision.grant.map((resource) => this.rowFor(resource, request)),
          )
        : [];
      const heldAlready = decision.held.map((resource) => this.matchingLive(resource, live)).filter(isPresent);

      const claims = [...inserted.map(toHolder), ...heldAlready];
      if (inserted.length) {
        this.logger.debug(`Claimed ${inserted.map((row) => row.resourceKey).join(', ')}`);
      }
      return { claimed: true, claims };
    });
  }

  /**
   * Release claims by id, by the run they are scoped to, or by workspace. Returns how many rows it marked
   * released. Idempotent: a claim already released, or one that reconciliation had stopped counting, costs
   * nothing to release again.
   */
  async release(target: ReleaseTarget): Promise<number> {
    const where = this.releaseWhere(target);
    if (!where) throw new Error('release needs claimIds, a scopeWorkflowId or a workspaceId.');
    const result = await this.claims.update({ ...where, releasedAt: IsNull() }, { releasedAt: new Date() });
    return result.affected ?? 0;
  }

  /** What each resource looks like right now — what a report and a held-back explanation are built from. */
  async availability(keys: readonly string[]): Promise<ResourceState[]> {
    const live = keys.length ? await this.liveClaims([...new Set(keys)]) : [];
    return keys.map((key) => {
      const holders = live.filter((holder) => holder.key === key);
      const capacity = this.capacityOf(key);
      return { key, capacity, holders, free: freeUnits(holders, capacity) };
    });
  }

  /**
   * Every live claim whose key starts with one of these prefixes.
   *
   * For a **family** of keys that is invented on demand — one per package, one per ticket — where the caller
   * cannot name them in advance and so cannot ask {@link availability} for them. Reconciled like every other
   * read: a claim whose scope target has settled or gone is not returned.
   */
  async heldByPrefix(prefixes: readonly string[]): Promise<ClaimHolder[]> {
    if (!prefixes.length) return [];
    const query = this.claims
      .createQueryBuilder('c')
      .where('c.released_at IS NULL')
      .andWhere(this.liveScopeCondition(), { terminal: TERMINAL_STATES })
      .andWhere(
        `(${prefixes.map((_, index) => `c.resource_key LIKE :prefix${index}`).join(' OR ')})`,
        Object.fromEntries(prefixes.map((prefix, index) => [`prefix${index}`, `${prefix}%`])),
      );
    return (await query.getMany()).map(toHolder);
  }

  /** Every live claim scoped to a run, or belonging to a workspace. */
  async heldBy(target: { scopeWorkflowId?: string; workspaceId?: string }): Promise<ClaimHolder[]> {
    const where = this.releaseWhere(target);
    if (!where) throw new Error('heldBy needs a scopeWorkflowId or a workspaceId.');
    const rows = await this.claims.find({ where: { ...where, releasedAt: IsNull() } });
    return rows.map(toHolder);
  }

  /**
   * The live claims on these resources — the only query that matters, because "live" is where the
   * reconciliation lives: released rows are out, and so is any row whose scope target has settled or gone.
   */
  private async liveClaims(keys: string[], manager?: EntityManager): Promise<ClaimHolder[]> {
    const repo = manager ? manager.getRepository(ResourceClaimEntity) : this.claims;
    const rows = await repo
      .createQueryBuilder('c')
      .where('c.resource_key IN (:...keys)', { keys })
      .andWhere('c.released_at IS NULL')
      .andWhere(this.liveScopeCondition(), { terminal: TERMINAL_STATES })
      .getMany();
    return rows.map(toHolder);
  }

  /**
   * The reconciliation, as SQL: a claim counts only while what it is scoped to is still there.
   *
   * This is the whole reason a claim cannot be left behind, so it is written once and used by every read.
   */
  private liveScopeCondition(): string {
    return `(
      (c.scope = 'workflow' AND EXISTS (
         SELECT 1 FROM core_workflow w WHERE w.id = c.scope_workflow_id AND w.status NOT IN (:...terminal)
      ))
      OR
      (c.scope = 'workspace' AND EXISTS (
         SELECT 1 FROM core_workspace ws WHERE ws.id = c.workspace_id
      ))
    )`;
  }

  private rowFor(resource: RequestedResource, request: ClaimRequest): Partial<ResourceClaimEntity> {
    return {
      resourceKey: resource.key,
      mode: resource.mode,
      scope: resource.scope,
      scopeWorkflowId: resource.scope === 'workflow' ? (resource.scopeWorkflowId ?? null) : null,
      workspaceId: resource.workspaceId,
      claimedByWorkflowId: request.claimedByWorkflowId ?? null,
      label: request.label ?? null,
      releasedAt: null,
    };
  }

  private matchingLive(resource: RequestedResource, live: readonly ClaimHolder[]): ClaimHolder | undefined {
    return live.find(
      (holder) =>
        holder.key === resource.key &&
        (resource.scope === 'workflow'
          ? holder.scopeWorkflowId === resource.scopeWorkflowId
          : holder.scope === 'workspace' && holder.workspaceId === resource.workspaceId),
    );
  }

  private releaseWhere(target: ReleaseTarget): Record<string, unknown> | undefined {
    if (target.claimIds?.length) return { id: In(target.claimIds) };
    if (target.scopeWorkflowId) return { scopeWorkflowId: target.scopeWorkflowId };
    if (target.workspaceId) return { workspaceId: target.workspaceId };
    return undefined;
  }
}

function toHolder(row: ResourceClaimEntity): ClaimHolder {
  return {
    claimId: row.id,
    key: row.resourceKey,
    mode: row.mode,
    scope: row.scope,
    workspaceId: row.workspaceId,
    ...(row.scopeWorkflowId ? { scopeWorkflowId: row.scopeWorkflowId } : {}),
    ...(row.claimedByWorkflowId ? { claimedByWorkflowId: row.claimedByWorkflowId } : {}),
    ...(row.label ? { label: row.label } : {}),
    since: row.claimedAt,
  };
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined;
}
