import {
  clearDatabase,
  setupTestEnvironment,
  TestSetup,
} from '../../__tests__/database-entities-utils';

describe('Namespace Entity Deletion Tests', () => {
  let testSetup: TestSetup;

  beforeAll(async () => {
    testSetup = await setupTestEnvironment({
      databaseName: 'namespace_entity_test',
    });
  });

  afterAll(async () => {
    await testSetup.cleanup();
  });

  beforeEach(async () => {
    await clearDatabase(testSetup.dataSource);
  });

  // Helper function to create test data
  async function createTestData() {
    const {
      projectRepo,
      workflowRepo,
      workspaceRepo,
      namespaceRepo,
    } = testSetup;

    // Create a workspace
    const workspace = await workspaceRepo.save({
      name: 'Test Workspace',
      title: 'Test Workspace',
    });

    // Create project
    const project = projectRepo.create({
      name: 'Test Project',
      title: 'Test Project',
    });
    await projectRepo.save(project);

    // Create parent namespace
    const parentNamespace = namespaceRepo.create({
      name: 'Parent Namespace',
      model: 'test',
      workspaceId: workspace.id,
      project: project,
    });
    await namespaceRepo.save(parentNamespace);

    // Create namespace to be deleted
    const namespaceToDelete = namespaceRepo.create({
      name: 'Namespace To Delete',
      model: 'test',
      workspaceId: workspace.id,
      project: project,
      parent: parentNamespace,
    });
    await namespaceRepo.save(namespaceToDelete);

    // Create child namespace
    const childNamespace = namespaceRepo.create({
      name: 'Child Namespace',
      model: 'test',
      workspaceId: workspace.id,
      project: project,
      parent: namespaceToDelete,
    });
    await namespaceRepo.save(childNamespace);

    // Create workflow in the namespace to be deleted
    const workflow = workflowRepo.create({
      name: 'Test Workflow',
      place: 'test',
      namespace: namespaceToDelete,
      labels: [namespaceToDelete.name],
    });
    await workflowRepo.save(workflow);

    return {
      project,
      parentNamespace,
      namespaceToDelete,
      childNamespace,
      workflow,
    };
  }

  it('should not delete the project when namespace is deleted', async () => {
    const { projectRepo, namespaceRepo } = testSetup;

    // Arrange
    const { namespaceToDelete, project } = await createTestData();

    // Act
    await namespaceRepo.delete(namespaceToDelete.id);

    // Assert
    const foundProject = await projectRepo.findOne({
      where: { id: project.id },
    });
    expect(foundProject).not.toBeNull();
    expect(foundProject!.id).toBe(project.id);
  });

  it('should not delete the parent namespace when namespace is deleted', async () => {
    const { namespaceRepo } = testSetup;

    // Arrange
    const { namespaceToDelete, parentNamespace } = await createTestData();

    // Act
    await namespaceRepo.delete(namespaceToDelete.id);

    // Assert
    const foundParentNamespace = await namespaceRepo.findOne({
      where: { id: parentNamespace.id },
    });
    expect(foundParentNamespace).not.toBeNull();
    expect(foundParentNamespace!.id).toBe(parentNamespace.id);
  });

  it('should delete child namespaces when namespace is deleted', async () => {
    const { namespaceRepo } = testSetup;

    // Arrange
    const { namespaceToDelete, childNamespace } = await createTestData();

    // Act
    await namespaceRepo.delete(namespaceToDelete.id);

    // Assert
    const foundChildNamespace = await namespaceRepo.findOne({
      where: { id: childNamespace.id },
    });
    expect(foundChildNamespace).toBeNull();
  });

  it('should delete workflows when namespace is deleted', async () => {
    const { namespaceRepo, workflowRepo } = testSetup;

    // Arrange
    const { namespaceToDelete, workflow } = await createTestData();

    // Act
    await namespaceRepo.delete(namespaceToDelete.id);

    // Assert
    const foundWorkflow = await workflowRepo.findOne({
      where: { id: workflow.id },
    });
    expect(foundWorkflow).toBeNull();
  });
});