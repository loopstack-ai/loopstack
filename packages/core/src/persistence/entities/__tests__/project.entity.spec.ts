import {
    clearDatabase,
    setupTestEnvironment,
    TestSetup,
} from '../../__tests__/database-entities-utils';

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

    // Helper function to create test data
    async function createTestData() {
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

        // Create project
        const project = projectRepo.create({
            name: 'Test Project',
            title: 'Test Project',
            workspace: workspace,
            workspaceId: workspace.id,
        });
        await projectRepo.save(project);

        // Create namespaces
        const namespace1 = namespaceRepo.create({
            name: 'Namespace 1',
            model: 'test',
            workspaceId: workspace.id,
            project: project,
            projectId: project.id,
        });
        await namespaceRepo.save(namespace1);

        const namespace2 = namespaceRepo.create({
            name: 'Namespace 2',
            model: 'test',
            workspaceId: workspace.id,
            project: project,
            projectId: project.id,
        });
        await namespaceRepo.save(namespace2);

        return {
            workspace,
            project,
            namespace1,
            namespace2,
        };
    }

    it('should not delete workspace when project is deleted', async () => {
        const { projectRepo, workspaceRepo } = testSetup;

        // Arrange
        const { project, workspace } = await createTestData();

        // Act
        await projectRepo.delete(project.id);

        // Assert
        const foundWorkspace = await workspaceRepo.findOne({
            where: { id: workspace.id },
        });
        expect(foundWorkspace).not.toBeNull();
        expect(foundWorkspace!.id).toBe(workspace.id);
    });

    it('should delete namespaces when project is deleted', async () => {
        const { projectRepo, namespaceRepo } = testSetup;

        // Arrange
        const { project, namespace1, namespace2 } = await createTestData();

        // Act
        await projectRepo.delete(project.id);

        // Assert
        const foundNamespace1 = await namespaceRepo.findOne({
            where: { id: namespace1.id },
        });
        const foundNamespace2 = await namespaceRepo.findOne({
            where: { id: namespace2.id },
        });

        expect(foundNamespace1).toBeNull();
        expect(foundNamespace2).toBeNull();
    });
});