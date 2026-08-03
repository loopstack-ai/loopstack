import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RunTraceEventEntity } from '@loopstack/common';
import type { RunTraceEvent } from '@loopstack/contracts/types';

/** stateDiff values above this serialized size are replaced with a truncation marker. */
const STATE_DIFF_VALUE_CAP = 2_000;

/**
 * Persistence for run-trace events. Rows are written per processing call; heavy payload
 * fields (tool args/envelopes, wait payloads) are elided unless payload recording is
 * enabled (`app.trace`). The read side backs `GET /workflows/:id/tool-calls`
 * and `loopstack runs <id> --record`.
 */
@Injectable()
export class RunTraceService {
  private readonly logger = new Logger(RunTraceService.name);

  constructor(
    @InjectRepository(RunTraceEventEntity)
    private readonly repository: Repository<RunTraceEventEntity>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Whether a run persists its trace: enabled per run (`WorkflowEntity.trace`, set at start
   * and inherited by sub-workflows) or globally via the `trace` module option /
   * `LOOPSTACK_TRACE` env var. Off by default — the in-memory trace always exists; only
   * persistence is opt-in.
   */
  isEnabled(runFlag: boolean | undefined): boolean {
    return runFlag === true || this.configService.get<boolean>('app.trace') === true;
  }

  /**
   * Persist a batch of trace events for one workflow, payloads verbatim (oversized state-diff
   * values capped). Failures are logged, never thrown — the trace is observability, not
   * execution state.
   */
  async saveBatch(
    context: { workflowId: string; workflowName: string; workspaceId: string },
    events: RunTraceEvent[],
  ): Promise<void> {
    if (events.length === 0) return;

    try {
      const rows = events.map((event) =>
        this.repository.create({
          workflowId: context.workflowId,
          workflowName: context.workflowName,
          workspaceId: context.workspaceId,
          seq: event.seq,
          type: event.type,
          payload:
            event.type === 'transition.completed' ? { ...event, stateDiff: capStateDiff(event.stateDiff) } : event,
        }),
      );
      await this.repository.save(rows);
    } catch (error) {
      this.logger.warn(
        `Failed to persist ${events.length} trace event(s) for workflow ${context.workflowId}: ` +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  /**
   * The next free `seq` for a workflow — one past the highest persisted value, 0 for a fresh
   * run. Lets stateful runs continue the sequence across processing calls, mirroring what the
   * stateless resume carrier provides for free.
   */
  async nextSeq(workflowId: string): Promise<number> {
    try {
      const row = (await this.repository
        .createQueryBuilder('e')
        .select('MAX(e.seq)', 'max')
        .where('e.workflowId = :workflowId', { workflowId })
        .getRawOne()) as { max: number | string | null } | undefined;
      return row?.max === null || row?.max === undefined ? 0 : Number(row.max) + 1;
    } catch (error) {
      this.logger.warn(
        `Failed to read max trace seq for workflow ${workflowId}: ` +
          (error instanceof Error ? error.message : String(error)),
      );
      return 0;
    }
  }

  /**
   * All events of the run tree rooted at `rootId` — the root's own events plus every
   * descendant sub-workflow's, resolved via the workflow parent chain. Optionally
   * filtered by event type.
   */
  async findByRunTree(rootId: string, types?: string[]): Promise<RunTraceEventEntity[]> {
    const rows = (await this.repository.query(
      `WITH RECURSIVE tree AS (
         SELECT id FROM core_workflow WHERE id = $1
         UNION ALL
         SELECT w.id FROM core_workflow w JOIN tree t ON w.parent_id = t.id
       )
       SELECT id FROM tree`,
      [rootId],
    )) as { id: string }[];

    return this.repository.find({
      where: {
        workflowId: In(rows.map((row) => row.id)),
        ...(types ? { type: In(types) } : {}),
      },
      order: { createdAt: 'ASC', seq: 'ASC' },
    });
  }
}

function capStateDiff(diff: Record<string, { before?: unknown; after?: unknown }>): typeof diff {
  const capped: typeof diff = {};
  for (const [key, change] of Object.entries(diff)) {
    capped[key] = {
      ...('before' in change ? { before: capValue(change.before) } : {}),
      ...('after' in change ? { after: capValue(change.after) } : {}),
    };
  }
  return capped;
}

function capValue(value: unknown): unknown {
  try {
    const serialized = JSON.stringify(value);
    if (serialized && serialized.length > STATE_DIFF_VALUE_CAP) {
      return `[truncated: ${serialized.length} chars]`;
    }
  } catch {
    return '[unserializable]';
  }
  return value;
}
