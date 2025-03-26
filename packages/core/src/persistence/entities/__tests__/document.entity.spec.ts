import {
  clearDatabase,
  setupTestEnvironment,
  TestSetup,
} from '../../__tests__/database-entities-utils';

describe('Document Entity Deletion Tests', () => {
  let testSetup: TestSetup;

  beforeAll(async () => {
    testSetup = await setupTestEnvironment({
      databaseName: 'document_entity_test',
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
      documentRepo,
    } = testSetup;

    // Create a workspace
    const workspace = await workspaceRepo.save({
      name: 'Test Workspace',
      title: 'Test Workspace',
    });

    // Create project
    const project = projectRepo.create({
      model: 'Test Project',
      title: 'Test Project',
    });
    await projectRepo.save(project);

    // Create namespace
    const namespace = namespaceRepo.create({
      name: 'Test Namespace',
      model: 'test',
      project: project,
      workspaceId: workspace.id,
    });
    await namespaceRepo.save(namespace);

    // Create workflow
    const workflow = workflowRepo.create({
      name: 'Test Workflow',
      place: 'test',
      namespace: namespace,
      labels: [namespace.name],
    });
    await workflowRepo.save(workflow);

    // Create document
    const document = documentRepo.create({
      name: 'Test Document',
      type: 'text',
      workspaceId: workspace.id,
      projectId: project.id,
      workflow: workflow,
      contentType: 'object',
      contents: { text: 'Test content' },
      labels: workflow.labels,
    });
    await documentRepo.save(document);

    // Create dependent workflow that depends on the document
    const dependentWorkflow1 = workflowRepo.create({
      name: 'Dependent Workflow 1',
      place: 'dependent1',
      namespace: namespace,
      labels: [namespace.name],
      dependencies: [document],
    });
    await workflowRepo.save(dependentWorkflow1);

    // Create another dependent workflow
    const dependentWorkflow2 = workflowRepo.create({
      name: 'Dependent Workflow 2',
      place: 'dependent2',
      namespace: namespace,
      labels: [namespace.name],
      dependencies: [document],
    });
    await workflowRepo.save(dependentWorkflow2);

    // Refresh to get the latest relationships
    const refreshedDocument = await documentRepo.findOne({
      where: { id: document.id },
      relations: ['workflow', 'dependentStates'],
    });

    const refreshedWorkflow = await workflowRepo.findOne({
      where: { id: workflow.id },
      relations: ['documents', 'dependencies'],
    });

    const refreshedDependentWorkflow1 = await workflowRepo.findOne({
      where: { id: dependentWorkflow1.id },
      relations: ['documents', 'dependencies'],
    });

    const refreshedDependentWorkflow2 = await workflowRepo.findOne({
      where: { id: dependentWorkflow2.id },
      relations: ['documents', 'dependencies'],
    });

    return {
      document: refreshedDocument!,
      workflow: refreshedWorkflow!,
      dependentWorkflow1: refreshedDependentWorkflow1!,
      dependentWorkflow2: refreshedDependentWorkflow2!,
    };
  }

  it('should not delete the workflow when document is deleted', async () => {
    const { documentRepo, workflowRepo } = testSetup;

    // Arrange
    const { document, workflow } = await createTestData();

    // Act
    await documentRepo.delete(document.id);

    // Assert
    const foundWorkflow = await workflowRepo.findOne({
      where: { id: workflow.id },
    });
    expect(foundWorkflow).not.toBeNull();
    expect(foundWorkflow!.id).toBe(workflow.id);
  });

  it('should not delete the dependent workflows when document is deleted', async () => {
    const { documentRepo, workflowRepo } = testSetup;

    // Arrange
    const { document, dependentWorkflow1, dependentWorkflow2 } = await createTestData();

    // Act
    await documentRepo.delete(document.id);

    // Assert
    const foundDependentWorkflow1 = await workflowRepo.findOne({
      where: { id: dependentWorkflow1.id },
    });
    expect(foundDependentWorkflow1).not.toBeNull();
    expect(foundDependentWorkflow1!.id).toBe(dependentWorkflow1.id);

    const foundDependentWorkflow2 = await workflowRepo.findOne({
      where: { id: dependentWorkflow2.id },
    });
    expect(foundDependentWorkflow2).not.toBeNull();
    expect(foundDependentWorkflow2!.id).toBe(dependentWorkflow2.id);
  });
});