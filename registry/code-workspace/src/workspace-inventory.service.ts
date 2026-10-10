import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { WorkflowEntity, WorkspaceEntity } from '@loopstack/common';
import { CODE_WORKSPACE_PROVISIONER, type CodeWorkspaceProvisioner } from './code-workspace.provisioner.js';
import type { ContainerInfo, SharedStateInfo, VolumeInfo } from './code-workspace.provisioner.js';

/** A checkout on disk, joined with whether its workflow row still exists. */
export interface CheckoutInventory {
  workflowId: string;
  existsInDb: boolean;
  /** The workflow row's status, when it exists (e.g. `running`, `completed`). */
  status?: string;
  sizeBytes: number;
  modifiedAt: string;
}

/** A workspace state dir on disk, joined with its DB row (when present). */
export interface WorkspaceInventory {
  workspaceId: string;
  existsInDb: boolean;
  /** Directory names that aren't well-formed ids are reported but never auto-reclaimed. */
  unrecognized: boolean;
  title?: string;
  appName?: string;
  sizeBytes: number;
  checkouts: CheckoutInventory[];
}

export interface ContainerInventory extends ContainerInfo {
  orphaned: boolean;
}
export interface VolumeInventory extends VolumeInfo {
  orphaned: boolean;
}

/** The full disk + docker picture, DB-joined. */
export interface Inventory {
  workspaces: WorkspaceInventory[];
  containers: ContainerInventory[];
  volumes: VolumeInventory[];
  /** Bases, seed tars and the npm cache — shared by every workspace, and the largest things on disk. */
  shared?: SharedStateInfo;
}

/**
 * What `cleanup_orphaned` would reclaim: whole workspace states whose workspace row is gone, and
 * checkouts (of still-existing workspaces) whose workflow row is gone. Both reclaim entry points are
 * idempotent and also sweep the matching containers/volumes by label — docker strays whose files are
 * already gone are covered by the same two calls.
 */
export interface OrphanPlan {
  workspaceIds: string[];
  checkouts: { workspaceId: string; workflowId: string }[];
  /**
   * Bases whose key no template declares any more — a changed provision config leaves the old tree behind,
   * and generation collection never touches it because it keeps every base's published generation.
   */
  bases: string[];
}

/** UUID shape of the runtime-generated ids; anything else on disk is foreign and left alone. */
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The base-provisioning container label value — a fixed key, not a workflow row. */
const BASE_WORKFLOW_KEY = 'base';

/**
 * Everything this module holds on disk and in Docker, joined against the workspace and workflow tables so
 * orphans — state whose owning row was deleted — are flagged with certainty rather than guessed at. Resource
 * names carry the raw ids, which is what makes the join exact.
 *
 * It lives beside the provisioner rather than inside it, deliberately: the provisioner knows what is on disk
 * and nothing about rows, and that is a property worth keeping. This is the piece that joins, so this is the
 * piece that holds the repositories.
 *
 * Read-only. What to reclaim, and whether to ask first, is the caller's decision.
 */
@Injectable()
export class WorkspaceInventoryService {
  constructor(
    @Inject(CODE_WORKSPACE_PROVISIONER) private readonly workspace: CodeWorkspaceProvisioner,
    @InjectRepository(WorkspaceEntity) private readonly workspaces: Repository<WorkspaceEntity>,
    @InjectRepository(WorkflowEntity) private readonly workflows: Repository<WorkflowEntity>,
  ) {}

  /** Pass `workspaceId` to scope the (du-heavy) scan to one workspace's state and docker resources. */
  async scan(workspaceId?: string): Promise<Inventory> {
    const [states, containers, volumes, shared] = await Promise.all([
      this.workspace.listWorkspaceStates(workspaceId),
      this.workspace.listContainers(workspaceId),
      this.workspace.listVolumes(workspaceId),
      // Shared state belongs to no workspace; a scoped scan leaves it out.
      workspaceId === undefined ? this.workspace.listSharedState() : Promise.resolve(undefined),
    ]);

    // One DB round-trip per table, over every id seen anywhere (dirs, container labels, volume labels).
    const wsIds = unique([
      ...states.map((s) => s.workspaceId),
      ...containers.map((c) => c.workspaceId),
      ...volumes.map((v) => v.workspaceId),
    ]).filter(isId);
    const wfIds = unique([
      ...states.flatMap((s) => s.checkouts.map((c) => c.workflowId)),
      ...containers.map((c) => c.workflowId),
      ...volumes.map((v) => v.workflowId),
    ]).filter(isId);

    const wsRows = wsIds.length ? await this.workspaces.find({ where: { id: In(wsIds) } }) : [];
    const wfRows = wfIds.length ? await this.workflows.find({ where: { id: In(wfIds) } }) : [];
    const wsById = new Map(wsRows.map((r) => [r.id, r]));
    const wfById = new Map(wfRows.map((r) => [r.id, r]));

    const workspaces: WorkspaceInventory[] = states.map((s) => {
      const row = wsById.get(s.workspaceId);
      return {
        workspaceId: s.workspaceId,
        existsInDb: !!row,
        unrecognized: !isId(s.workspaceId),
        title: row?.title ?? undefined,
        appName: row?.appName,
        sizeBytes: s.sizeBytes,
        checkouts: s.checkouts.map((c) => ({
          workflowId: c.workflowId,
          existsInDb: wfById.has(c.workflowId),
          status: wfById.get(c.workflowId)?.status,
          sizeBytes: c.sizeBytes,
          modifiedAt: c.modifiedAt,
        })),
      };
    });

    // A docker resource is orphaned when its workspace row is gone, or its workflow label names a deleted
    // workflow row. The fixed `base` key is workspace-scoped, not a workflow row.
    const dockerOrphaned = (wsId: string, wfId?: string): boolean => {
      if (!isId(wsId)) return false; // foreign labels are never auto-reclaimed
      if (!wsById.has(wsId)) return true;
      if (!wfId || wfId === BASE_WORKFLOW_KEY) return false;
      return isId(wfId) ? !wfById.has(wfId) : false;
    };

    return {
      workspaces,
      containers: containers.map((c) => ({ ...c, orphaned: dockerOrphaned(c.workspaceId, c.workflowId) })),
      volumes: volumes.map((v) => ({ ...v, orphaned: dockerOrphaned(v.workspaceId, v.workflowId) })),
      shared,
    };
  }

  /**
   * The reclaim plan for everything orphaned — see {@link OrphanPlan} for what the entry points cover.
   *
   * `knownBaseKeys` is what the host's templates provision right now ({@link KNOWN_BASE_KEYS}); a base on
   * disk outside that set is left over. A scan scoped to one workspace reads no shared state, so it never
   * proposes a base.
   */
  orphanPlan(inventory: Inventory, knownBaseKeys: readonly string[] = []): OrphanPlan {
    const workspaceIds = new Set<string>();
    for (const ws of inventory.workspaces) {
      if (!ws.existsInDb && !ws.unrecognized) workspaceIds.add(ws.workspaceId);
    }
    // Docker strays (state dir already gone) still name their owner in the labels.
    for (const item of [...inventory.containers, ...inventory.volumes]) {
      if (item.orphaned && isId(item.workspaceId) && !this.stillExists(inventory, item.workspaceId)) {
        workspaceIds.add(item.workspaceId);
      }
    }

    const checkouts = new Map<string, { workspaceId: string; workflowId: string }>();
    for (const ws of inventory.workspaces) {
      if (!ws.existsInDb) continue; // whole workspace goes anyway
      for (const c of ws.checkouts) {
        if (!c.existsInDb && isId(c.workflowId)) {
          checkouts.set(`${ws.workspaceId}/${c.workflowId}`, { workspaceId: ws.workspaceId, workflowId: c.workflowId });
        }
      }
    }
    // Docker strays scoped to a deleted workflow of a still-existing workspace.
    for (const item of [...inventory.containers, ...inventory.volumes]) {
      if (!item.orphaned || workspaceIds.has(item.workspaceId)) continue;
      if (item.workflowId && item.workflowId !== BASE_WORKFLOW_KEY && isId(item.workflowId)) {
        checkouts.set(`${item.workspaceId}/${item.workflowId}`, {
          workspaceId: item.workspaceId,
          workflowId: item.workflowId,
        });
      }
    }

    // A base is proposed only when nothing provisions it, nothing is building it, and no live checkout was
    // cloned from one of its generations. The last two are facts the scan already read off disk.
    //
    // No keys means the caller did not say which are declared — never that none are. Reading it the other way
    // would propose every base on disk, which is the one mistake here that cannot be undone.
    const bases = (knownBaseKeys.length ? (inventory.shared?.bases ?? []) : [])
      .filter((base) => !knownBaseKeys.includes(base.baseKey))
      .filter((base) => !base.locked && !base.generations.some((generation) => generation.referenced))
      .map((base) => base.baseKey);

    return { workspaceIds: [...workspaceIds], checkouts: [...checkouts.values()], bases };
  }

  // ── Markdown rendering ───────────────────────────────────────────────────────────────────────────────

  renderInventory(inventory: Inventory, knownBaseKeys: readonly string[] = []): string {
    const lines: string[] = ['### Engineer state inventory', ''];

    if (!inventory.workspaces.length) lines.push('_No workspace state on disk._', '');
    for (const ws of inventory.workspaces) {
      lines.push(`#### ${this.workspaceLabel(ws)} — ${formatBytes(ws.sizeBytes)}`);
      lines.push(`- id: \`${ws.workspaceId}\``);
      if (!ws.checkouts.length) lines.push('- checkouts: none');
      for (const c of ws.checkouts) {
        const db = c.existsInDb ? `run \`${c.status}\`` : '**orphaned** (run deleted)';
        lines.push(
          `- checkout \`${c.workflowId}\` — ${formatBytes(c.sizeBytes)}, ${db}, touched ${c.modifiedAt.slice(0, 10)}`,
        );
      }
      lines.push('');
    }

    lines.push('#### Containers');
    if (!inventory.containers.length) lines.push('_None._');
    for (const c of inventory.containers) {
      lines.push(
        `- \`${c.name}\` — ${c.running ? 'running' : 'stopped'}${c.orphaned ? ', **orphaned**' : ''} (ws \`${c.workspaceId.slice(0, 8)}\`${c.workflowId ? `, wf \`${c.workflowId.slice(0, 8)}\`` : ''})`,
      );
    }
    lines.push('', '#### Volumes (dind caches)');
    if (!inventory.volumes.length) lines.push('_None._');
    for (const v of inventory.volumes) {
      lines.push(`- \`${v.name}\`${v.orphaned ? ' — **orphaned**' : ''}`);
    }
    if (inventory.shared) lines.push('', ...this.renderShared(inventory.shared, knownBaseKeys));
    return lines.join('\n');
  }

  /** The shared state: every base with its generations, then the seed tars and the npm cache. */
  private renderShared(shared: SharedStateInfo, knownBaseKeys: readonly string[] = []): string[] {
    const lines = ['#### Shared bases'];
    if (!shared.bases.length) lines.push('_None provisioned._');
    for (const base of shared.bases) {
      const known = knownBaseKeys.includes(base.baseKey);
      lines.push(
        `- base \`${base.baseKey}\` — ${formatBytes(base.sizeBytes)}${base.locked ? ', **being provisioned**' : ''}` +
          `${known ? '' : ', **no template provisions it**'}`,
      );
      for (const gen of base.generations) {
        const status = gen.current ? 'current' : gen.referenced ? 'kept — a checkout still reads it' : 'superseded';
        lines.push(`  - \`${gen.generation}\` — ${formatBytes(gen.sizeBytes)}, ${status}`);
      }
    }
    lines.push(
      '',
      `#### Seed images — ${formatBytes(shared.seedImagesBytes)}`,
      `#### npm cache — ${formatBytes(shared.npmCacheBytes)}`,
    );
    return lines;
  }

  renderOrphanPlan(inventory: Inventory, plan: OrphanPlan): string {
    const lines: string[] = ['### Orphaned state to reclaim', ''];
    for (const wsId of plan.workspaceIds) {
      const ws = inventory.workspaces.find((w) => w.workspaceId === wsId);
      lines.push(`- workspace \`${wsId}\` — ${ws ? formatBytes(ws.sizeBytes) : 'docker resources only'} (row deleted)`);
    }
    for (const c of plan.checkouts) {
      const ws = inventory.workspaces.find((w) => w.workspaceId === c.workspaceId);
      const co = ws?.checkouts.find((x) => x.workflowId === c.workflowId);
      lines.push(
        `- checkout \`${c.workflowId}\` of ${ws ? this.workspaceLabel(ws) : `\`${c.workspaceId}\``} — ${co ? formatBytes(co.sizeBytes) : 'docker resources only'} (run deleted)`,
      );
    }
    for (const baseKey of plan.bases) {
      const base = inventory.shared?.bases.find((candidate) => candidate.baseKey === baseKey);
      lines.push(
        `- base \`${baseKey}\` — ${base ? formatBytes(base.sizeBytes) : 'unknown size'}, ` +
          `${base?.generations.length ?? 0} generation(s) (no template provisions it; nothing reads it)`,
      );
    }
    lines.push(
      '',
      'Matching containers and dind volumes are removed with each entry. Superseded base generations — ' +
        'neither current nor read by a checkout — are collected afterwards. Nothing else is touched.',
    );
    return lines.join('\n');
  }

  private workspaceLabel(ws: WorkspaceInventory): string {
    if (ws.unrecognized) return `\`${ws.workspaceId}\` (unrecognized — not managed, never auto-reclaimed)`;
    if (!ws.existsInDb) return `\`${ws.workspaceId}\` (**orphaned** — workspace deleted)`;
    return `**${ws.title || ws.workspaceId}** (${ws.appName})`;
  }

  private stillExists(inventory: Inventory, workspaceId: string): boolean {
    return inventory.workspaces.some((w) => w.workspaceId === workspaceId && w.existsInDb);
  }
}

function unique<T>(values: (T | undefined)[]): T[] {
  return [...new Set(values.filter((v): v is T => v !== undefined))];
}

function isId(value: string | undefined): value is string {
  return !!value && ID_PATTERN.test(value);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
