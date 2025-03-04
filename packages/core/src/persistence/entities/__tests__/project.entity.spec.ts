import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProjectEntity } from '../project.entity';
import { WorkspaceEntity } from '../workspace.entity';
import { NamespaceEntity } from '../namespace.entity';
import { DocumentEntity } from '../document.entity';
import { WorkflowEntity } from '../workflow.entity';
import { INestApplication } from '@nestjs/common';
import { ProjectStatus } from '@loopstack/shared';

describe('Project Entity Deletion Tests', () => {
  let pgConnection: DataSource;
  let app: INestApplication;
  let dataSource: DataSource;
  let projectRepo: Repository<ProjectEntity>;
  let workflowRepo: Repository<WorkflowEntity>;
  let workspaceRepo: Repository<WorkspaceEntity>;
  let namespaceRepo: Repository<NamespaceEntity>;
  let documentRepo: Repository<DocumentEntity>;

  const databaseName = 'test_project_entity';

  beforeAll(async () => {
    pgConnection = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'admin',
      database: 'postgres', // Default database
    });

    await pgConnection.initialize();

    // Create a unique test database
    try {
      await pgConnection.query(`DROP DATABASE IF EXISTS ${databaseName}`);
      await pgConnection.query(`CREATE DATABASE ${databaseName}`);
    } catch (err) {
      console.error('Could not create test database', err);
      throw err;
    }

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'admin',
          database: databaseName,
          entities: [
            ProjectEntity,
            WorkspaceEntity,
            NamespaceEntity,
            DocumentEntity,
            WorkflowEntity,
          ],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([
          ProjectEntity,
          WorkspaceEntity,
          NamespaceEntity,
          DocumentEntity,
          WorkflowEntity,
        ]),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    dataSource = moduleRef.get<DataSource>(DataSource);
    projectRepo = moduleRef.get<Repository<ProjectEntity>>(
      getRepositoryToken(ProjectEntity),
    );
    workflowRepo = moduleRef.get<Repository<WorkflowEntity>>(
      getRepositoryToken(WorkflowEntity),
    );
    workspaceRepo = moduleRef.get<Repository<WorkspaceEntity>>(
      getRepositoryToken(WorkspaceEntity),
    );
    namespaceRepo = moduleRef.get<Repository<NamespaceEntity>>(
      getRepositoryToken(NamespaceEntity),
    );
    documentRepo = moduleRef.get<Repository<DocumentEntity>>(
      getRepositoryToken(DocumentEntity),
    );
  });

  afterAll(async () => {
    await dataSource.destroy(); // Explicitly destroy connection
    await app.close();

    if (pgConnection && pgConnection.isInitialized) {
      try {
        await pgConnection.query(`DROP DATABASE IF EXISTS ${databaseName}`);
      } finally {
        await pgConnection.destroy();
      }
    }
  });

  beforeEach(async () => {
    // Clear all tables before each test to ensure isolation
    await dataSource.query('TRUNCATE "document" CASCADE');
    await dataSource.query('TRUNCATE "workflow" CASCADE');
    await dataSource.query('TRUNCATE "workflow_namespace" CASCADE');
    await dataSource.query('TRUNCATE "workflow_document" CASCADE');
    await dataSource.query('TRUNCATE "project" CASCADE');
    await dataSource.query('TRUNCATE "namespace" CASCADE');
    await dataSource.query('TRUNCATE "workspace" CASCADE');
  });

  describe('Project deletion cascade behaviors', () => {
    it('should cascade delete workflows when a project is deleted', async () => {
      // Create a workspace
      const workspace = await workspaceRepo.save({
        name: 'Test Workspace',
        title: 'Test Workspace',
      });

      // Create a project
      const project = await projectRepo.save({
        name: 'Test Project',
        title: 'Test Project',
        status: ProjectStatus.New,
        workspace: workspace,
        workspaceId: workspace.id,
      });

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
      const project = await projectRepo.save({
        name: 'Test Project',
        title: 'Test Project',
        status: ProjectStatus.New,
        workspace: workspace,
        workspaceId: workspace.id,
        namespaces: [namespace1],
      });

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
