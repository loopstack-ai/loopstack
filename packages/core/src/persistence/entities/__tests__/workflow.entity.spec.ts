import {
    clearDatabase,
    setupTestEnvironment,
    TestSetup,
} from '../../__tests__/database-entities-utils';

describe('Workflow Entity Cascade Delete Tests', () => {
    let testSetup: TestSetup;

    beforeAll(async () => {
        testSetup = await setupTestEnvironment({
            databaseName: 'workflow_entity_test',
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
            workspaceId: workspace.id,
            project: project,
        });
        await namespaceRepo.save(namespace);

        // Create workflow
        let workflow = workflowRepo.create({
            name: 'Test Workflow',
            place: 'test',
            namespace: namespace,
            labels: [namespace.name],
        });
        workflow = await workflowRepo.save(workflow);

        // Create dependent documents
        const dependentDoc1 = documentRepo.create({
            name: 'Dependent Doc 1',
            type: 'text',
            workspaceId: workspace.id,
            projectId: project.id,
            contentType: 'object',
            contents: { text: 'Dependent content 1' },
            labels: [],
        });
        await documentRepo.save(dependentDoc1);

        const dependentDoc2 = documentRepo.create({
            name: 'Dependent Doc 2',
            type: 'text',
            workspaceId: workspace.id,
            projectId: project.id,
            contentType: 'object',
            contents: { text: 'Dependent content 2' },
            labels: [],
        });
        await documentRepo.save(dependentDoc2);

        // Associate dependencies with workflow
        workflow.dependencies = [dependentDoc1, dependentDoc2];
        await workflowRepo.save(workflow);

        // Create workflow documents (these should be deleted when workflow is deleted)
        const workflowDoc1 = documentRepo.create({
            name: 'Workflow Doc 1',
            type: 'text',
            workspaceId: workspace.id,
            projectId: project.id,
            workflow: workflow,
            contentType: 'object',
            contents: { text: 'Workflow Doc 1' },
            labels: [],
        });
        await documentRepo.save(workflowDoc1);

        const workflowDoc2 = documentRepo.create({
            name: 'Workflow Doc 2',
            type: 'text',
            workspaceId: workspace.id,
            projectId: project.id,
            workflow: workflow,
            contentType: 'object',
            contents: { text: 'Workflow Doc 2' },
            labels: [],
        });
        await documentRepo.save(workflowDoc2);

        // Refresh workflow with all relations
        workflow = (await workflowRepo.findOne({
            where: { id: workflow.id },
            relations: ['namespace', 'dependencies', 'documents'],
        }))!;

        return {
            workflow,
            namespace,
            dependentDoc1,
            dependentDoc2,
            workflowDoc1,
            workflowDoc2,
        };
    }

    it('should handle cascade delete correctly when workflow is deleted', async () => {
        const { namespaceRepo, workflowRepo, documentRepo } = testSetup;

        // Arrange
        const {
            workflow,
            namespace,
            dependentDoc1,
            dependentDoc2,
            workflowDoc1,
            workflowDoc2
        } = await createTestData();

        // Store IDs for later verification
        const namespaceId = namespace.id;
        const dependentDoc1Id = dependentDoc1.id;
        const dependentDoc2Id = dependentDoc2.id;
        const workflowDoc1Id = workflowDoc1.id;
        const workflowDoc2Id = workflowDoc2.id;

        // Act - Delete the workflow
        await workflowRepo.delete(workflow.id);

        // Assert

        // 1. Verify namespace still exists (should not be deleted)
        const foundNamespace = await namespaceRepo.findOne({
            where: { id: namespaceId },
        });
        expect(foundNamespace).not.toBeNull();
        expect(foundNamespace!.id).toBe(namespaceId);

        // 2. Verify dependencies still exist (should not be deleted)
        const foundDependentDoc1 = await documentRepo.findOne({
            where: { id: dependentDoc1Id },
        });
        expect(foundDependentDoc1).not.toBeNull();
        expect(foundDependentDoc1!.id).toBe(dependentDoc1Id);

        const foundDependentDoc2 = await documentRepo.findOne({
            where: { id: dependentDoc2Id },
        });
        expect(foundDependentDoc2).not.toBeNull();
        expect(foundDependentDoc2!.id).toBe(dependentDoc2Id);

        // 3. Verify workflow documents are deleted
        const foundWorkflowDoc1 = await documentRepo.findOne({
            where: { id: workflowDoc1Id },
        });
        expect(foundWorkflowDoc1).toBeNull();

        const foundWorkflowDoc2 = await documentRepo.findOne({
            where: { id: workflowDoc2Id },
        });
        expect(foundWorkflowDoc2).toBeNull();
    });
});