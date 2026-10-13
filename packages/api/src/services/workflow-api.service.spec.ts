import type { ConfigService } from '@nestjs/config';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import { DataSource, type Logger } from 'typeorm';
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
import type {
  CreateWorkflowService,
  RunTraceService,
  WorkflowCheckpointService,
  WorkflowRegistryService,
} from '@loopstack/core';
import { WorkflowApiService } from './workflow-api.service.js';

/**
 * The run list's child counts are SQL, so they are checked against Postgres rather than a mock. Skipped
 * where no database is configured; CI provides one.
 *
 * Every test runs in a schema of its own, dropped afterwards, so it never touches an app's tables.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const SCHEMA = `workflow_api_spec_${process.pid}`;

describe.skipIf(!DATABASE_URL)('WorkflowApiService.findAll', () => {
  let dataSource: DataSource;
  let service: WorkflowApiService;
  const user = randomUUID();
  const idsByKey = new Map<string, string>();
  // Every query the data source runs while `recorded` is set.
  let recorded: string[] | undefined;
  const logger: Logger = {
    logQuery: (sql) => recorded?.push(sql),
    logQueryError: () => {},
    logQuerySlow: () => {},
    logSchemaBuild: () => {},
    logMigration: () => {},
    log: () => {},
  };

  beforeAll(async () => {
    const setup = new DataSource({ type: 'postgres', url: DATABASE_URL });
    await setup.initialize();
    await setup.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    await setup.query(`CREATE SCHEMA "${SCHEMA}"`);
    // TypeORM creates the extension its uuid columns need in the first schema of the search path, where a
    // spec running beside this one cannot see it and dropping the schema removes it: it lives in `public`.
    await setup.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public').catch((error: { code?: string }) => {
      // Created by a spec running beside this one between its check and ours.
      if (error.code !== '23505') throw error;
    });
    await setup.destroy();

    dataSource = new DataSource({
      type: 'postgres',
      url: DATABASE_URL,
      // The service's SQL names its tables unqualified, as it does in an app: the search path decides.
      extra: { options: `-c search_path=${SCHEMA},public` },
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
      logger,
    });
    await dataSource.initialize();

    await dataSource.getRepository(User).save({ id: user, type: UserTypeEnum.Local });
    const workspace = await dataSource
      .getRepository(WorkspaceEntity)
      .save({ title: 'runs', appName: 'a', createdBy: user });

    const runs: { key: string; status: WorkflowState; parent?: string }[] = [
      { key: 'parent', status: WorkflowState.Waiting },
      { key: 'running child', status: WorkflowState.Running, parent: 'parent' },
      { key: 'finished child', status: WorkflowState.Completed, parent: 'parent' },
      { key: 'finished parent', status: WorkflowState.Completed },
      { key: 'finished parent child', status: WorkflowState.Completed, parent: 'finished parent' },
      { key: 'alone', status: WorkflowState.Completed },
    ];
    for (const run of runs) {
      const saved = await dataSource.getRepository(WorkflowEntity).save({
        workflowName: run.key,
        status: run.status,
        workspaceId: workspace.id,
        createdBy: user,
        parentId: run.parent ? idsByKey.get(run.parent)! : null,
      });
      idsByKey.set(run.key, saved.id);
    }

    const config = { get: (_key: string, fallback: unknown) => fallback } as unknown as ConfigService;
    service = new WorkflowApiService(
      dataSource.getRepository(WorkflowEntity),
      config,
      {} as WorkflowCheckpointService,
      {} as RunTraceService,
      {} as CreateWorkflowService,
      {} as WorkflowRegistryService,
      {} as EventEmitter2,
    );
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    await dataSource.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    await dataSource.destroy();
  });

  it('counts the children and the active children of each run', async () => {
    const { data } = await service.findAll(user, { topLevel: true }, [], { page: 0, limit: 100 });
    const counts = Object.fromEntries(
      data.map((run) => {
        const { hasChildren, activeChildren } = run as WorkflowEntity & { hasChildren: number; activeChildren: number };
        return [run.workflowName, { hasChildren, activeChildren }];
      }),
    );
    expect(counts).toEqual({
      parent: { hasChildren: 2, activeChildren: 1 },
      'finished parent': { hasChildren: 1, activeChildren: 0 },
      alone: { hasChildren: 0, activeChildren: 0 },
    });
  });

  it("counts only the children of the page's runs", async () => {
    recorded = [];
    await service.findAll(user, { topLevel: true }, [], { page: 0, limit: 100 });
    const queries = recorded;
    recorded = undefined;

    const counts = queries.filter((sql) => sql.includes('COUNT(*) AS "cnt"'));
    expect(counts).toHaveLength(2);
    for (const sql of counts) expect(sql).toMatch(/"parent_id" IN \(/);
  });
});
