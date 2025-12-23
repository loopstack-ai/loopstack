import { TestingModuleBuilder } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentEntity, NamespaceEntity, PipelineEntity, WorkflowEntity, WorkspaceEntity } from '@loopstack/common';
import { MigrationsService, TaskSchedulerService } from '@loopstack/core';

const createMockRepository = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  findOneBy: jest.fn().mockResolvedValue(null),
  findBy: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'mock-id', ...entity })),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  remove: jest.fn().mockResolvedValue({}),
});

export function mockCoreModuleProviders(builder: TestingModuleBuilder): TestingModuleBuilder {
  return builder
    .overrideProvider(getRepositoryToken(PipelineEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(WorkflowEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(DocumentEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(WorkspaceEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(NamespaceEntity))
    .useValue(createMockRepository())
    .overrideProvider(MigrationsService)
    .useValue({})
    .overrideProvider(TaskSchedulerService)
    .useValue({});
}
