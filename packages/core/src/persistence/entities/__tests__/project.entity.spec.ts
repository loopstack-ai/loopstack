import { ProjectStatus } from '@loopstack/shared';
import {clearDatabase, setupTestEnvironment, TestSetup} from "../../__tests__/database-entities-utils";

describe('Project Entity Deletion Tests', () => {
  let testSetup: TestSetup;

  beforeAll(async () => {
    testSetup = await setupTestEnvironment();
  });

  afterAll(async () => {
    await testSetup.cleanup();
  });

  beforeEach(async () => {
    await clearDatabase(testSetup.dataSource);
  });

  describe('Project deletion cascade behaviors', () => {
    it('should cascade delete workflows when a project is deleted', async () => {
      const {
        projectRepo,
        workflowRepo,
        workspaceRepo,
      } = testSetup;

      // Create a workspace
      const workspace = await workspaceRepo.save({
        name: 'Test Workspace',
        title: 'Test Workspace',
      });

      // Create a project
      const project = await projectRepo.save(projectRepo.create({
        name: 'Test Project',
        title: 'Test Project',
        status: ProjectStatus.New,
        workspace: workspace,
        workspaceId: workspace.id,
      }));

      // Create workflows linked to the project
      const workflow1 = await workflowRepo.save(workflowRepo.create({
        name: 'Workflow 1',
        place: 'test',
        project: project,
        projectId: project.id,
      }));

      const workflow2 = await workflowRepo.save(workflowRepo.create({
        name: 'Workflow 2',
        place: 'test',
        project: project,
        projectId: project.id,
      }));

      // Verify workflows are created
      const workflowsBefore = await workflowRepo.find({
        where: { projectId: project.id },
      });
      expect(workflowsBefore.length).toBe(2);

      // Delete the project
      await projectRepo.delete(project.id);

      // Verify the project is deleted
      const deletedProject = await projectRepo.findOne({
        where: { id: project.id },
      });
      expect(deletedProject).toBeNull();

      // Verify workflows are cascade deleted
      const workflowsAfter = await workflowRepo.find({
        where: { projectId: project.id },
      });
      expect(workflowsAfter.length).toBe(0);
    });

    it('should not delete workspaces and namespaces when a project is deleted', async () => {
      const {
        projectRepo,
        workspaceRepo,
        namespaceRepo,
      } = testSetup;

      // Create a workspace
      const workspace = await workspaceRepo.save({
        name: 'Test Workspace',
        title: 'Test Workspace',
      });

      // Create namespaces
      const namespace1 = namespaceRepo.create({
        name: 'Namespace 1',
        model: 'test',
        workspaceId: workspace.id,
      });
      await namespaceRepo.save(namespace1);

      // Create a project in the workspace
      const project = await projectRepo.save(projectRepo.create({
        name: 'Test Project',
        title: 'Test Project',
        status: ProjectStatus.New,
        workspace: workspace,
        workspaceId: workspace.id,
        namespaces: [namespace1],
      }));

      // Verify the project is created with workspace reference
      const createdProject = await projectRepo.findOne({
        where: { id: project.id },
        relations: ['workspace'],
      });
      expect(createdProject).toBeDefined();
      expect(createdProject!.workspaceId).toBe(workspace.id);

      // Delete the project
      await projectRepo.delete(project.id);

      // Verify the project is deleted
      const deletedProject = await projectRepo.findOne({
        where: { id: project.id },
      });
      expect(deletedProject).toBeNull();

      // Verify the workspace still exists
      const workspaceAfter = await workspaceRepo.findOne({
        where: { id: workspace.id },
      });
      expect(workspaceAfter).toBeDefined();
      expect(workspaceAfter!.id).toBe(workspace.id);

      const namespaceAfter = await namespaceRepo.findOne({
        where: { id: namespace1.id },
      });
      expect(namespaceAfter).toBeDefined();
      expect(namespaceAfter!.id).toBe(namespace1.id);
    });
  });
});
