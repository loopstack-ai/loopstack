import {
  clearDatabase,
  setupTestEnvironment,
  TestSetup,
} from '../../__tests__/database-entities-utils';

describe('Workspace Entity Deletion Tests', () => {
  let testSetup: TestSetup;

  beforeAll(async () => {
    testSetup = await setupTestEnvironment({
      databaseName: 'workspace_entity_test',
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
    const { workspaceRepo, projectRepo } = testSetup;

    // Create a workspace
    const workspace = workspaceRepo.create({
      title: 'Test Workspace',
    });
    await workspaceRepo.save(workspace);

    // Create projects
    const project1 = projectRepo.create({
      model: 'Test Project 1',
      title: 'Test Project 1',
      workspace: workspace,
    });
    await projectRepo.save(project1);

    const project2 = projectRepo.create({
      model: 'Test Project 2',
      title: 'Test Project 2',
      workspace: workspace,
    });
    await projectRepo.save(project2);

    return {
      workspace,
      project1,
      project2,
    };
  }

  it('should delete projects when workspace is deleted', async () => {
    const { workspaceRepo, projectRepo } = testSetup;

    // Arrange
    const { workspace, project1, project2 } = await createTestData();

    // Act
    await workspaceRepo.delete(workspace.id);

    // Assert
    const foundProject1 = await projectRepo.findOne({
      where: { id: project1.id },
    });
    expect(foundProject1).toBeNull();

    const foundProject2 = await projectRepo.findOne({
      where: { id: project2.id },
    });
    expect(foundProject2).toBeNull();
  });
});
