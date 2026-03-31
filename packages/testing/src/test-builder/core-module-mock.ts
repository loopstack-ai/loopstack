import { TestingModuleBuilder } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DocumentEntity,
  EventSubscriberEntity,
  SecretEntity,
  WorkflowEntity,
  WorkspaceEntity,
  WorkspaceEnvironmentEntity,
} from '@loopstack/common';

const createMockRepository = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  findOneBy: jest.fn().mockResolvedValue(null),
  findBy: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockImplementation((dto: unknown) => dto),
  save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'mock-id', ...entity })),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  remove: jest.fn().mockResolvedValue({}),
});

export function mockCoreModuleProviders(builder: TestingModuleBuilder): TestingModuleBuilder {
  return builder
    .overrideProvider(getRepositoryToken(WorkflowEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(DocumentEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(WorkspaceEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(EventSubscriberEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(WorkspaceEnvironmentEntity))
    .useValue(createMockRepository())
    .overrideProvider(getRepositoryToken(SecretEntity))
    .useValue(createMockRepository());
}
