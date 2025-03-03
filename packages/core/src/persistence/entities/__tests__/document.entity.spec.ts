import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProjectEntity } from '../project.entity';
import { WorkspaceEntity } from '../workspace.entity';
import { NamespaceEntity } from '../namespace.entity';
import { DocumentEntity } from '../document.entity';
import { WorkflowEntity } from '../workflow.entity';
import { INestApplication } from '@nestjs/common';

describe('Document Entity Deletion Tests', () => {
  let pgConnection: DataSource;
  let app: INestApplication;
  let dataSource: DataSource;
  let projectRepo: Repository<ProjectEntity>;
  let workflowRepo: Repository<WorkflowEntity>;
  let workspaceRepo: Repository<WorkspaceEntity>;
  let namespaceRepo: Repository<NamespaceEntity>;
  let documentRepo: Repository<DocumentEntity>;

  const databaseName = 'test_document_entity';

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

  describe('Document deletion behavior', () => {
    it('should not delete a workflow when a document is deleted', async () => {
      // Create a workspace
      const workspace = workspaceRepo.create({
        title: 'Test Workspace',
      });
      await workspaceRepo.save(workspace);

      // Create a project
      const project = projectRepo.create({
        name: 'Test Project',
        title: 'Test Project',
        workspaceId: workspace.id,
      });
      await projectRepo.save(project);

      // Create a workflow
      const workflow = workflowRepo.create({
        name: 'Test Workflow',
        place: 'test',
        project,
      });
      await workflowRepo.save(workflow);

      // Create a document associated with the workflow
      const document = documentRepo.create({
        name: 'Test Document',
        type: 'text',
        workspaceId: workspace.id,
        projectId: project.id,
        workflow: workflow,
        contents: { text: 'Test content' },
        meta: { property: 'value' },
      });
      await documentRepo.save(document);

      // Verify the document and workflow exist
      const savedDocument = await documentRepo.findOne({
        where: { id: document.id },
        relations: ['workflow'],
      });
      expect(savedDocument).toBeDefined();
      expect(savedDocument!.workflow.id).toBe(workflow.id);

      // Delete the document
      await documentRepo.delete(document.id);

      // Verify the document is deleted
      const deletedDocument = await documentRepo.findOne({
        where: { id: document.id },
      });
      expect(deletedDocument).toBeNull();

      // Verify the workflow still exists
      const existingWorkflow = await workflowRepo.findOne({
        where: { id: workflow.id },
      });
      expect(existingWorkflow).toBeDefined();
      expect(existingWorkflow!.id).toBe(workflow.id);
    });

    it('should remove the document reference from the workflow after document deletion', async () => {
      // Create a workspace
      const workspace = workspaceRepo.create({
        title: 'Test Workspace',
      });
      await workspaceRepo.save(workspace);

      // Create a project
      const project = projectRepo.create({
        name: 'Test Project',
        title: 'Test Project',
        workspaceId: workspace.id,
      });
      await projectRepo.save(project);

      // Create a workflow
      const workflow = workflowRepo.create({
        name: 'Test Workflow',
        place: 'test',
        project: project,
      });
      await workflowRepo.save(workflow);

      // Create multiple documents associated with the workflow
      const document1 = documentRepo.create({
        name: 'Test Document 1',
        type: 'text',
        workspaceId: workspace.id,
        projectId: project.id,
        workflow: workflow,
        contents: { text: 'Test content 1' },
      });
      await documentRepo.save(document1);

      const document2 = documentRepo.create({
        name: 'Test Document 2',
        type: 'text',
        workspaceId: workspace.id,
        projectId: project.id,
        workflow: workflow,
        contents: { text: 'Test content 2' },
      });
      await documentRepo.save(document2);

      // Verify both documents are associated with the workflow
      const workflowWithDocs = await workflowRepo.findOne({
        where: { id: workflow.id },
        relations: ['documents'],
      });
      expect(workflowWithDocs!.documents.length).toBe(2);

      // Delete one document
      await documentRepo.delete(document1.id);

      // Verify only one document remains associated with the workflow
      const updatedWorkflow = await workflowRepo.findOne({
        where: { id: workflow.id },
        relations: ['documents'],
      });
      expect(updatedWorkflow).toBeDefined();
      expect(updatedWorkflow!.documents.length).toBe(1);
      expect(updatedWorkflow!.documents[0].id).toBe(document2.id);
    });
  });
});
