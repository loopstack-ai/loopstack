import { Global, Module } from '@nestjs/common';
import { TestingModuleBuilder } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';
import {
  DocumentEntity,
  RunTraceEventEntity,
  WorkflowCheckpointEntity,
  WorkflowEntity,
  WorkspaceEntity,
} from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';

const createMockRepository = () => ({
  find: vi.fn().mockResolvedValue([]),
  findOne: vi.fn().mockResolvedValue(null),
  findOneBy: vi.fn().mockResolvedValue(null),
  findBy: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockImplementation((dto: unknown) => dto),
  save: vi.fn().mockImplementation((entity) => Promise.resolve({ id: 'mock-id', ...entity })),
  update: vi.fn().mockResolvedValue({ affected: 1 }),
  delete: vi.fn().mockResolvedValue({ affected: 1 }),
  remove: vi.fn().mockResolvedValue({}),
});

const createMockDataSource = () => ({
  // Read by @nestjs/typeorm's repository factory before it calls getRepository — an empty
  // list plus a non-mongo `options.type` lets the factory resolve a mock repository for any
  // feature entity (`TypeOrmModule.forFeature([Entity])`) without a real connection, so
  // feature modules boot in the hermetic facade the same way core entities already do.
  entityMetadatas: [] as unknown[],
  options: { type: 'postgres' },
  createQueryRunner: vi.fn().mockReturnValue({
    connect: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
    release: vi.fn(),
    manager: {
      save: vi.fn().mockImplementation((entity) => Promise.resolve(entity)),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
    },
  }),
  getRepository: vi.fn().mockReturnValue(createMockRepository()),
});

/**
 * `WorkflowRunner` is the programmatic-execution service that enqueues real background jobs;
 * it lives in `TaskQueueModule`, which `LoopCoreModule.forTesting()` excludes. Feature modules
 * that ship triggers (OAuth's callback controller, scheduling's webhook/cron controllers) inject
 * it into controllers that NestJS instantiates even in a workflow test. A stub lets those modules
 * boot; the hermetic facade never actually runs it (workflows are driven by `runWorkflow`).
 */
const createMockWorkflowRunner = () => ({
  run: vi.fn().mockResolvedValue({ workflowId: 'mock-workflow-id' }),
});

@Global()
@Module({
  providers: [
    {
      provide: DataSource,
      useFactory: () => createMockDataSource(),
    },
    {
      provide: WorkflowRunner,
      useFactory: () => createMockWorkflowRunner(),
    },
  ],
  exports: [DataSource, WorkflowRunner],
})
export class MockInfraModule {}

export function mockCoreModuleProviders(builder: TestingModuleBuilder): TestingModuleBuilder {
  return builder
    .overrideProvider(getRepositoryToken(WorkflowEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(DocumentEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(WorkspaceEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(WorkflowCheckpointEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(RunTraceEventEntity))
    .useValue(createMockRepository());
}
