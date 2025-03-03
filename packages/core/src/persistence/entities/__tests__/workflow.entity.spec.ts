import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProjectEntity } from '../project.entity';
import { WorkspaceEntity } from '../workspace.entity';
import { NamespaceEntity } from '../namespace.entity';
import { DocumentEntity } from '../document.entity';
import { WorkflowEntity } from '../workflow.entity';
import { INestApplication } from '@nestjs/common';

describe('Workflow Entity Deletion Tests', () => {
  let pgConnection: DataSource;
  let app: INestApplication;
  let dataSource: DataSource;
  let projectRepo: Repository<ProjectEntity>;
  let workflowRepo: Repository<WorkflowEntity>;
  let workspaceRepo: Repository<WorkspaceEntity>;
  let namespaceRepo: Repository<NamespaceEntity>;
  let documentRepo: Repository<DocumentEntity>;

  const databaseName = 'test_workflow_entity';

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
        // WorkflowSubscriber,
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

  // Helper function to create test data
  async function createTestData() {
    // Create a workspace
    const workspace = await workspaceRepo.save({
      name: 'Test Workspace',
      title: 'Test Workspace',
    });

    // Create project
    const project = projectRepo.create({
      name: 'Test Project',
      title: 'Test Project',
      workspace,
    });
    await projectRepo.save(project);

    // Create namespaces
    const namespace1 = namespaceRepo.create({
      name: 'Namespace 1',
      model: 'test',
      workspaceId: workspace.id,
    });
    await namespaceRepo.save(namespace1);

    const namespace2 = namespaceRepo.create({
      name: 'Namespace 2',
      model: 'test',
      workspaceId: workspace.id,
    });
    await namespaceRepo.save(namespace2);

    // Create workflow
    let workflow1 = workflowRepo.create({
      name: 'Test Workflow',
      project: project,
      place: 'test1',
      namespaces: [namespace1, namespace2],
    });
    workflow1 = await workflowRepo.save(workflow1);

    let workflow2 = workflowRepo.create({
      name: 'Test Workflow',
      project: project,
      place: 'test2',
      namespaces: [namespace1, namespace2],
    });
    workflow2 = await workflowRepo.save(workflow2);

    // Create dependent documents
    const dependentDoc1 = documentRepo.create({
      name: 'Dependent Doc 1',
      type: 'text',
      workspaceId: workspace.id,
      projectId: project.id,
      workflow: workflow1,
      contents: { text: 'Test content 1' },
    });
    await documentRepo.save(dependentDoc1);

    const dependentDoc2 = documentRepo.create({
      name: 'Dependent Doc 2',
      type: 'text',
      workspaceId: workspace.id,
      projectId: project.id,
      workflow: workflow1,
      contents: { text: 'Test content 2' },
    });
    await documentRepo.save(dependentDoc2);

    workflow2.dependencies = [dependentDoc1, dependentDoc2];
    await workflowRepo.save(workflow2);

    // Create workflow documents
    const workflowDoc1 = documentRepo.create({
      name: 'Workflow Doc 1',
      type: 'text',
      workspaceId: workspace.id,
      projectId: project.id,
      workflow: workflow2,
      contents: { text: 'Workflow Doc 1' },
    });
    await documentRepo.save(workflowDoc1);

    const workflowDoc2 = documentRepo.create({
      name: 'Workflow Doc 2',
      type: 'text',
      workspaceId: workspace.id,
      projectId: project.id,
      workflow: workflow2,
      contents: { text: 'Workflow Doc 2' },
    });
    await documentRepo.save(workflowDoc2);

    workflow1 = (await workflowRepo.findOne({
      where: { id: workflow1.id },
      relations: ['namespaces', 'project', 'dependencies', 'documents'],
    }))!;
    workflow2 = (await workflowRepo.findOne({
      where: { id: workflow2.id },
      relations: ['namespaces', 'project', 'dependencies', 'documents'],
    }))!;

    return {
      project,
      workflow1,
      workflow2,
      namespace1,
      namespace2,
      dependentDoc1,
      dependentDoc2,
      workflowDoc1,
      workflowDoc2,
    };
  }

  it('should not delete project when workflow is deleted', async () => {
    // Arrange
    const { workflow2, project } = await createTestData();

    // Act
    await workflowRepo.delete(workflow2.id);

    // Assert
    const foundProject = await projectRepo.findOne({
      where: { id: project.id },
    });
    expect(foundProject).not.toBeNull();
    expect(foundProject!.id).toBe(project.id);
  });

  it('should delete namespace relations when workflow is deleted', async () => {
    // Arrange
    const { workflow2, namespace1, namespace2 } = await createTestData();

    // Create another workflow with a reference to namespace1
    const anotherWorkflow = workflowRepo.create({
      name: 'Another Workflow',
      place: 'test3',
      namespaces: [namespace1],
    });
    await workflowRepo.save(anotherWorkflow);

    // Act
    await workflowRepo.delete(workflow2.id);

    // Assert
    // Namespace1 should still exist because it's related to anotherWorkflow
    const foundNamespace1 = await namespaceRepo.findOne({
      where: { id: namespace1.id },
    });
    expect(foundNamespace1).not.toBeNull();

    // Namespace2 should be deleted as it no longer has any relations
    const foundNamespace2 = await namespaceRepo.findOne({
      where: { id: namespace2.id },
    });
    expect(foundNamespace2).not.toBeNull(); // This might seem counterintuitive, but ManyToMany relationships don't auto-delete the entities

    // Verify the relation in the junction table is removed
    const relationCount = await dataSource.query(
      `SELECT COUNT(*) FROM workflow_namespace WHERE workflow_id = $1 AND namespace_id = $2`,
      [workflow2.id, namespace2.id],
    );
    expect(parseInt(relationCount[0].count)).toBe(0);
  });

  // Test 4: Dependency relations should be removed but dependent entities should not be deleted
  it('should remove dependency relations but not delete dependent documents when workflow is deleted', async () => {
    // Arrange
    const { workflow2, dependentDoc1, dependentDoc2 } = await createTestData();

    // Act
    await workflowRepo.delete(workflow2.id);

    // Assert
    // Dependent documents should still exist
    const foundDoc1 = await documentRepo.findOne({
      where: { id: dependentDoc1.id },
    });
    const foundDoc2 = await documentRepo.findOne({
      where: { id: dependentDoc2.id },
    });

    expect(foundDoc1).not.toBeNull();
    expect(foundDoc2).not.toBeNull();

    // Verify the relations in the junction table are removed
    const relationCount = await dataSource.query(
      `SELECT COUNT(*) FROM workflow_document WHERE workflow_id = $1`,
      [workflow2.id],
    );
    expect(parseInt(relationCount[0].count)).toBe(0);
  });

  // Test 5: Related documents should be deleted when the workflow is deleted
  it('should delete related documents when workflow is deleted', async () => {
    // Arrange
    const { workflow2, workflowDoc1, workflowDoc2 } = await createTestData();

    // Act
    await workflowRepo.delete(workflow2.id);

    // Assert
    const foundDoc1 = await documentRepo.findOne({
      where: { id: workflowDoc1.id },
    });
    const foundDoc2 = await documentRepo.findOne({
      where: { id: workflowDoc2.id },
    });

    expect(foundDoc1).toBeNull();
    expect(foundDoc2).toBeNull();
  });

  // Test 6: Combined test to verify all cascade behaviors
  it('should correctly handle all cascade behaviors when workflow is deleted', async () => {
    // Arrange
    const testData = await createTestData();

    // Act
    await workflowRepo.delete(testData.workflow2.id);

    // Assert
    // 1. Project should not be deleted
    const foundProject = await projectRepo.findOne({
      where: { id: testData.project.id },
    });
    expect(foundProject).not.toBeNull();

    // 2. Namespace relations should be deleted from junction table
    const namespaceRelations = await dataSource.query(
      `SELECT COUNT(*) FROM workflow_namespace WHERE workflow_id = $1`,
      [testData.workflow2.id],
    );
    expect(parseInt(namespaceRelations[0].count)).toBe(0);

    // 3. Dependent documents should not be deleted
    const foundDependentDoc1 = await documentRepo.findOne({
      where: { id: testData.dependentDoc1.id },
    });
    const foundDependentDoc2 = await documentRepo.findOne({
      where: { id: testData.dependentDoc2.id },
    });
    expect(foundDependentDoc1).not.toBeNull();
    expect(foundDependentDoc2).not.toBeNull();

    // Dependency relations should be removed from junction table
    const documentRelations = await dataSource.query(
      `SELECT COUNT(*) FROM workflow_document WHERE workflow_id = $1`,
      [testData.workflow2.id],
    );
    expect(parseInt(documentRelations[0].count)).toBe(0);

    // 4. Related documents should be deleted
    const foundWorkflowDoc1 = await documentRepo.findOne({
      where: { id: testData.workflowDoc1.id },
    });
    const foundWorkflowDoc2 = await documentRepo.findOne({
      where: { id: testData.workflowDoc2.id },
    });
    expect(foundWorkflowDoc1).toBeNull();
    expect(foundWorkflowDoc2).toBeNull();
  });
});
