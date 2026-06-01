import { Global, Module } from '@nestjs/common';
import { TestingModuleBuilder } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';
import { DocumentEntity, WorkflowCheckpointEntity, WorkflowEntity, WorkspaceEntity } from '@loopstack/common';

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

@Global()
@Module({
  providers: [
    {
      provide: DataSource,
      useFactory: () => createMockDataSource(),
    },
  ],
  exports: [DataSource],
})
export class MockDataSourceModule {}

export function mockCoreModuleProviders(builder: TestingModuleBuilder): TestingModuleBuilder {
  return builder
    .overrideProvider(getRepositoryToken(WorkflowEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(DocumentEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(WorkspaceEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(WorkflowCheckpointEntity))
    .useValue(createMockRepository());
}
