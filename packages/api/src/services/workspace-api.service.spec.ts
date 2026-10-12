import type { ConfigService } from '@nestjs/config';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ApiTokenEntity,
  DocumentEntity,
  Role,
  RunTraceEventEntity,
  User,
  UserTypeEnum,
  WorkflowCheckpointEntity,
  WorkflowEntity,
  WorkflowState,
  WorkspaceEntity,
} from '@loopstack/common';
import type { WorkspaceActivity } from '@loopstack/contracts/api';
import type { StudioDiscoveryService } from '@loopstack/core';
import { WorkspaceApiService } from './workspace-api.service.js';

/**
 * The activity filter is SQL, so it is checked against Postgres rather than a mock: what matters is what
 * the subqueries select. Skipped where no database is configured; CI provides one.
 *
 * Every test runs in a schema of its own, dropped afterwards, so it never touches an app's tables.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const SCHEMA = `workspace_api_spec_${process.pid}`;

const MANUAL = [{ id: 'answer', from: 'ask', to: 'done', trigger: 'manual' }];
const AUTOMATIC = [{ id: 'retry', from: 'step', to: 'step' }];

interface RunFixture {
  key: string;
  status: WorkflowState;
  availableTransitions?: unknown[] | null;
  parent?: string;
}

/**
 * The cases the rule has to tell apart. The same cases, under the same names, are classified by
 * `classifyWorkspace` in `studio/src/features/fleet/fleet-model.spec.ts` — the card and the filter must
 * agree on each one.
 */
const WORKSPACES: Record<string, { appName: string; expected: WorkspaceActivity; runs: RunFixture[] }> = {
  'waiting on you': {
    appName: 'a',
    expected: 'waiting',
    runs: [{ key: 'ask', status: WorkflowState.Waiting, availableTransitions: MANUAL }],
  },
  working: {
    appName: 'a',
    expected: 'working',
    runs: [{ key: 'step', status: WorkflowState.Running }],
  },
  'parked on a child': {
    appName: 'b',
    expected: 'working',
    runs: [
      { key: 'root', status: WorkflowState.Waiting, availableTransitions: MANUAL },
      { key: 'child', status: WorkflowState.Running, parent: 'root' },
    ],
  },
  'child waiting on you': {
    appName: 'b',
    expected: 'waiting',
    runs: [
      { key: 'root', status: WorkflowState.Waiting, availableTransitions: MANUAL },
      { key: 'child', status: WorkflowState.Waiting, availableTransitions: MANUAL, parent: 'root' },
    ],
  },
  'parked between retries': {
    appName: 'c',
    expected: 'working',
    runs: [{ key: 'retry', status: WorkflowState.Waiting, availableTransitions: AUTOMATIC }],
  },
  queued: {
    appName: 'c',
    expected: 'queued',
    runs: [{ key: 'queued', status: WorkflowState.Pending }],
  },
  'queued behind work': {
    appName: 'c',
    expected: 'working',
    runs: [
      { key: 'queued', status: WorkflowState.Pending },
      { key: 'step', status: WorkflowState.Running },
    ],
  },
  idle: {
    appName: 'd',
    expected: 'idle',
    runs: [
      { key: 'done', status: WorkflowState.Completed },
      { key: 'failed', status: WorkflowState.Failed },
    ],
  },
};

describe.skipIf(!DATABASE_URL)('WorkspaceApiService.findAll', () => {
  let dataSource: DataSource;
  let service: WorkspaceApiService;
  const user = randomUUID();
  const otherUser = randomUUID();
  const idsByName = new Map<string, string>();

  beforeAll(async () => {
    const setup = new DataSource({ type: 'postgres', url: DATABASE_URL });
    await setup.initialize();
    await setup.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    await setup.query(`CREATE SCHEMA "${SCHEMA}"`);
    await setup.destroy();

    dataSource = new DataSource({
      type: 'postgres',
      url: DATABASE_URL,
      // The service's SQL names its tables unqualified, as it does in an app: the search path decides.
      extra: { options: `-c search_path=${SCHEMA}` },
      entities: [
        ApiTokenEntity,
        DocumentEntity,
        Role,
        RunTraceEventEntity,
        User,
        WorkflowCheckpointEntity,
        WorkflowEntity,
        WorkspaceEntity,
      ],
      synchronize: true,
    });
    await dataSource.initialize();

    await dataSource.getRepository(User).save([
      { id: user, type: UserTypeEnum.Local },
      { id: otherUser, type: UserTypeEnum.Local },
    ]);

    const workspaces = dataSource.getRepository(WorkspaceEntity);
    const workflows = dataSource.getRepository(WorkflowEntity);
    for (const [title, fixture] of Object.entries(WORKSPACES)) {
      const workspace = await workspaces.save({ title, appName: fixture.appName, createdBy: user });
      idsByName.set(title, workspace.id);
      const runIds = new Map<string, string>();
      for (const run of fixture.runs) {
        const saved = await workflows.save({
          workflowName: run.key,
          status: run.status,
          availableTransitions: (run.availableTransitions ?? null) as WorkflowEntity['availableTransitions'],
          workspaceId: workspace.id,
          createdBy: user,
          parentId: run.parent ? runIds.get(run.parent)! : null,
        });
        runIds.set(run.key, saved.id);
      }
    }

    // Another user's workspace never shows up, whatever its state.
    await workspaces.save({ title: 'not yours', appName: 'a', createdBy: otherUser });

    const config = { get: (_key: string, fallback: unknown) => fallback } as unknown as ConfigService;
    service = new WorkspaceApiService(workspaces, config, {} as StudioDiscoveryService, {} as EventEmitter2);
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    await dataSource.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    await dataSource.destroy();
  });

  async function titles(filter: Parameters<WorkspaceApiService['findAll']>[1]): Promise<string[]> {
    const { data } = await service.findAll(user, filter, [], { page: 0, limit: 100 });
    return data.map((workspace) => workspace.title).sort();
  }

  function expectedTitles(...activities: WorkspaceActivity[]): string[] {
    return Object.entries(WORKSPACES)
      .filter(([, fixture]) => activities.includes(fixture.expected))
      .map(([title]) => title)
      .sort();
  }

  it.each<WorkspaceActivity>(['waiting', 'working', 'queued', 'idle'])(
    'selects the %s workspaces',
    async (activity) => {
      expect(await titles({ activity })).toEqual(expectedTitles(activity));
    },
  );

  it('selects workspaces in any of several states', async () => {
    expect(await titles({ activity: ['waiting', 'queued'] })).toEqual(expectedTitles('waiting', 'queued'));
  });

  it('puts every workspace in exactly one state', async () => {
    const all = await titles({});
    const byState = await Promise.all(
      (['waiting', 'working', 'queued', 'idle'] as const).map((activity) => titles({ activity })),
    );
    expect(byState.flat().sort()).toEqual(all);
  });

  it('selects workspaces of any of several apps', async () => {
    expect(await titles({ appName: ['a', 'd'] })).toEqual(['idle', 'waiting on you', 'working']);
  });

  it('combines the activity filter with search and the column filters', async () => {
    const { data } = await service.findAll(user, { appName: 'b', activity: 'working' }, [], {}, 'parked');
    expect(data.map((workspace) => workspace.id)).toEqual([idsByName.get('parked on a child')]);
  });
});
