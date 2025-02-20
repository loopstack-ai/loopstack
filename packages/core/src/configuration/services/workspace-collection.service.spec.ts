import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceCollectionService } from './workspace-collection.service';
import {WorkspaceConfigInterface} from "@loopstack/shared";

describe('WorkspaceCollectionService - Singleton Test', () => {
  let moduleRef: TestingModule;
  let serviceInstance1: WorkspaceCollectionService;
  let serviceInstance2: WorkspaceCollectionService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [WorkspaceCollectionService],
    }).compile();

    serviceInstance1 = moduleRef.get<WorkspaceCollectionService>(
      WorkspaceCollectionService,
    );
    serviceInstance2 = moduleRef.get<WorkspaceCollectionService>(
      WorkspaceCollectionService,
    );
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('should be a singleton (same instance every time)', () => {
    expect(serviceInstance1).toBe(serviceInstance2);
  });

  it('should retain data across multiple injections', () => {
    const workspaces: WorkspaceConfigInterface[] = [
      { name: 'Workspace1' },
    ];

    serviceInstance1.create(workspaces);
    expect(serviceInstance2.getAll()).toEqual(workspaces);
  });
});
