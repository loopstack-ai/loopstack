import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProjectEntity } from '../project.entity';
import { WorkspaceEntity } from '../workspace.entity';
import { NamespaceEntity } from '../namespace.entity';
import { DocumentEntity } from '../document.entity';
import { WorkflowEntity } from '../workflow.entity';
import { INestApplication } from '@nestjs/common';
import {clearDatabase, setupTestEnvironment, TestSetup} from "../../__tests__/database-entities-utils";

describe('Workspace Entity Deletion Tests', () => {
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

  describe('Workspace deletion cascade behavior', () => {
    it('should cascade delete all associated projects when workspace is deleted', async () => {
      const {
        projectRepo,
        workspaceRepo,
      } = testSetup;

      // Create a workspace
      const workspace = workspaceRepo.create({
        title: 'Test Workspace',
        isLocked: false,
        createdBy: '00000000-0000-0000-0000-000000000000',
      });

      const savedWorkspace = await workspaceRepo.save(workspace);

      // Create multiple projects associated with the workspace
      const project1 = projectRepo.create({
        name: 'Test Project 1',
        title: 'Test Project 1',
        workspace: savedWorkspace,
      });

      const project2 = projectRepo.create({
        name: 'Test Project 2',
        title: 'Test Project 2',
        workspace: savedWorkspace,
      });

      const project3 = projectRepo.create({
        name: 'Test Project 3',
        title: 'Test Project 3',
        workspace: savedWorkspace,
      });

      await projectRepo.save([project1, project2, project3]);

      // Verify projects were created and associated with workspace
      const projectsBeforeDeletion = await projectRepo.find({
        where: { workspace: { id: savedWorkspace.id } },
      });

      expect(projectsBeforeDeletion.length).toBe(3);

      // Delete the workspace
      await workspaceRepo.delete(savedWorkspace.id);

      // Verify workspace was deleted
      const deletedWorkspace = await workspaceRepo.findOne({
        where: { id: savedWorkspace.id },
      });

      expect(deletedWorkspace).toBeNull();

      // Verify all projects were cascade deleted
      const projectsAfterDeletion = await projectRepo.find({
        where: { workspace: { id: savedWorkspace.id } },
      });

      expect(projectsAfterDeletion.length).toBe(0);

      // Double-check by trying to find projects by their IDs
      const project1AfterDeletion = await projectRepo.findOne({
        where: { id: project1.id },
      });

      const project2AfterDeletion = await projectRepo.findOne({
        where: { id: project2.id },
      });

      const project3AfterDeletion = await projectRepo.findOne({
        where: { id: project3.id },
      });

      expect(project1AfterDeletion).toBeNull();
      expect(project2AfterDeletion).toBeNull();
      expect(project3AfterDeletion).toBeNull();
    });

    it('should not affect other workspaces and their projects when a workspace is deleted', async () => {
      const {
        projectRepo,
        workspaceRepo,
      } = testSetup;

      // Create two workspaces
      const workspace1 = workspaceRepo.create({
        title: 'Workspace 1',
        isLocked: false,
        createdBy: '00000000-0000-0000-0000-000000000000',
      });

      const workspace2 = workspaceRepo.create({
        title: 'Workspace 2',
        isLocked: false,
        createdBy: '11111111-1111-1111-1111-111111111111',
      });

      const [savedWorkspace1, savedWorkspace2] = await workspaceRepo.save([
        workspace1,
        workspace2,
      ]);

      // Create projects for workspace 1
      const workspace1Project1 = projectRepo.create({
        name: 'Workspace 1 - Project 1',
        title: 'Workspace 1 - Project 1',
        workspace: savedWorkspace1,
      });

      const workspace1Project2 = projectRepo.create({
        name: 'Workspace 1 - Project 2',
        title: 'Workspace 1 - Project 2',
        workspace: savedWorkspace1,
      });

      // Create projects for workspace 2
      const workspace2Project1 = projectRepo.create({
        name: 'Workspace 2 - Project 1',
        title: 'Workspace 2 - Project 1',
        workspace: savedWorkspace2,
      });

      const workspace2Project2 = projectRepo.create({
        name: 'Workspace 2 - Project 2',
        title: 'Workspace 2 - Project 2',
        workspace: savedWorkspace2,
      });

      await projectRepo.save([
        workspace1Project1,
        workspace1Project2,
        workspace2Project1,
        workspace2Project2,
      ]);

      // Delete workspace 1
      await workspaceRepo.delete(savedWorkspace1.id);

      // Verify workspace 1 was deleted
      const deletedWorkspace = await workspaceRepo.findOne({
        where: { id: savedWorkspace1.id },
      });

      expect(deletedWorkspace).toBeNull();

      // Verify workspace 1 projects were deleted
      const workspace1ProjectsAfterDeletion = await projectRepo.find({
        where: { workspace: { id: savedWorkspace1.id } },
      });

      expect(workspace1ProjectsAfterDeletion.length).toBe(0);

      // Verify workspace 2 and its projects still exist
      const workspace2AfterDeletion = await workspaceRepo.findOne({
        where: { id: savedWorkspace2.id },
      });

      expect(workspace2AfterDeletion).not.toBeNull();

      const workspace2ProjectsAfterDeletion = await projectRepo.find({
        where: { workspace: { id: savedWorkspace2.id } },
      });

      expect(workspace2ProjectsAfterDeletion.length).toBe(2);
    });
  });
});
