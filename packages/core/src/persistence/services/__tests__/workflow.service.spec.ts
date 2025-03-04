import {WorkflowService} from "../workflow.service";
import {WorkflowEntity} from "../../entities";
import {clearDatabase, setupTestEnvironment, TestSetup} from "../../__tests__/database-entities-utils";

describe('WorkflowService', () => {
    let testSetup: TestSetup;
    let workflowService: WorkflowService;

    beforeAll(async () => {
        testSetup = await setupTestEnvironment({
            providers: [WorkflowService]
        });
        workflowService = testSetup.moduleRef.get<WorkflowService>(WorkflowService);
    });

    afterAll(async () => {
        await testSetup.cleanup();
    });

    beforeEach(async () => {
        await clearDatabase(testSetup.dataSource);
    });

    // Helper function to create test data with more workflow variations
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

        // Create projects
        const project1 = projectRepo.create({
            name: 'Project 1',
            title: 'Project 1',
            workspace,
        });
        await projectRepo.save(project1);

        const project2 = projectRepo.create({
            name: 'Project 2',
            title: 'Project 2',
            workspace,
        });
        await projectRepo.save(project2);

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

        const namespace3 = namespaceRepo.create({
            name: 'Namespace 3',
            model: 'test',
            workspaceId: workspace.id,
        });
        await namespaceRepo.save(namespace3);

        // Create workflows with various namespace combinations
        // Workflow 1: Project 1, no namespaces
        let workflow1 = workflowRepo.create({
            name: 'Workflow No Namespaces',
            project: project1,
            place: 'test1',
            namespaces: [],
        });
        workflow1 = await workflowRepo.save(workflow1);

        // Workflow 2: Project 1, has namespace1
        let workflow2 = workflowRepo.create({
            name: 'Workflow Single Namespace',
            project: project1,
            place: 'test2',
            namespaces: [namespace1],
        });
        workflow2 = await workflowRepo.save(workflow2);

        // Workflow 3: Project 1, has namespace1 and namespace2
        let workflow3 = workflowRepo.create({
            name: 'Workflow Two Namespaces',
            project: project1,
            place: 'test3',
            namespaces: [namespace1, namespace2],
        });
        workflow3 = await workflowRepo.save(workflow3);

        // Workflow 4: Project 1, has namespace1, namespace2, and namespace3
        let workflow4 = workflowRepo.create({
            name: 'Workflow All Namespaces',
            project: project1,
            place: 'test4',
            namespaces: [namespace1, namespace2, namespace3],
        });
        workflow4 = await workflowRepo.save(workflow4);

        // Workflow 5: Project 1, has only namespace2 and namespace3
        let workflow5 = workflowRepo.create({
            name: 'Workflow Other Namespaces',
            project: project1,
            place: 'test5',
            namespaces: [namespace2, namespace3],
        });
        workflow5 = await workflowRepo.save(workflow5);

        // Workflow 6: Project 2, has namespace1 and namespace2 (different project)
        let workflow6 = workflowRepo.create({
            name: 'Workflow Two Namespaces',  // Same name as workflow3 but different project
            project: project2,
            place: 'test6',
            namespaces: [namespace1, namespace2],
        });
        workflow6 = await workflowRepo.save(workflow6);

        // Create some documents for the workflows
        const document1 = documentRepo.create({
            name: 'Document 1',
            type: 'text',
            workspaceId: workspace.id,
            projectId: project1.id,
            workflow: workflow1,
            contents: { text: 'Document 1 content' },
        });
        await documentRepo.save(document1);

        const document2 = documentRepo.create({
            name: 'Document 2',
            type: 'text',
            workspaceId: workspace.id,
            projectId: project1.id,
            workflow: workflow3,
            contents: { text: 'Document 2 content' },
        });
        await documentRepo.save(document2);

        return {
            project1,
            project2,
            namespace1,
            namespace2,
            namespace3,
            workflow1,
            workflow2,
            workflow3,
            workflow4,
            workflow5,
            workflow6,
            document1,
            document2,
        };
    }

    describe('findWorkflows', () => {
        it('should find all workflows for a project without filtering', async () => {
            // Arrange
            const testData = await createTestData();

            // Act
            const result = await workflowService.createFindQuery(testData.project1.id).getMany();

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect((result as WorkflowEntity[]).length).toBe(5); // All workflows in project1
            expect((result as WorkflowEntity[]).map(w => w.id)).toContain(testData.workflow1.id);
            expect((result as WorkflowEntity[]).map(w => w.id)).toContain(testData.workflow2.id);
            expect((result as WorkflowEntity[]).map(w => w.id)).toContain(testData.workflow3.id);
            expect((result as WorkflowEntity[]).map(w => w.id)).toContain(testData.workflow4.id);
            expect((result as WorkflowEntity[]).map(w => w.id)).toContain(testData.workflow5.id);
            expect((result as WorkflowEntity[]).map(w => w.id)).not.toContain(testData.workflow6.id); // Different project
        });

        it('should find workflows by name', async () => {
            // Arrange
            const testData = await createTestData();

            // Act
            const result = await workflowService.createFindQuery(testData.project1.id, {
                name: 'Workflow Two Namespaces'
            }).getMany();

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect((result as WorkflowEntity[]).length).toBe(1);
            expect((result as WorkflowEntity[])[0].id).toBe(testData.workflow3.id);
        });

        it('should find a single workflow with findOne option', async () => {
            // Arrange
            const testData = await createTestData();

            // Act
            const result = await workflowService.createFindQuery(testData.project1.id, {
                name: 'Workflow Two Namespaces',
            }).getOne();

            // Assert
            expect(Array.isArray(result)).toBe(false);
            expect((result as WorkflowEntity).id).toBe(testData.workflow3.id);
        });

        it('should find workflows with no namespaces when empty array is provided', async () => {
            // Arrange
            const testData = await createTestData();

            // Act
            const result = await workflowService.createFindQuery(testData.project1.id, {
                namespaceIds: []
            }).getMany();

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect((result as WorkflowEntity[]).length).toBe(1);
            expect((result as WorkflowEntity[])[0].id).toBe(testData.workflow1.id);
        });

        it('should find workflows with exact namespace match (single namespace)', async () => {
            // Arrange
            const testData = await createTestData();

            // Act
            const result = await workflowService.createFindQuery(testData.project1.id, {
                namespaceIds: [testData.namespace1.id]
            }).getMany();

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect((result as WorkflowEntity[]).length).toBe(1);
            expect((result as WorkflowEntity[])[0].id).toBe(testData.workflow2.id);
        });

        it('should find workflows with exact namespace match (two namespaces)', async () => {
            // Arrange
            const testData = await createTestData();

            // Act
            const result = await workflowService.createFindQuery(testData.project1.id, {
                namespaceIds: [testData.namespace1.id, testData.namespace2.id]
            }).getMany()

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect((result as WorkflowEntity[]).length).toBe(1);
            expect((result as WorkflowEntity[])[0].id).toBe(testData.workflow3.id);
        });

        it('should not find workflows when namespace combination does not exactly match', async () => {
            // Arrange
            const testData = await createTestData();

            // Act
            // Looking for workflows with EXACTLY namespace1 & namespace3, which doesn't exist
            const result = await workflowService.createFindQuery(testData.project1.id, {
                namespaceIds: [testData.namespace1.id, testData.namespace3.id]
            }).getMany();

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect((result as WorkflowEntity[]).length).toBe(0);
        });

        it('should find workflows with exact namespace match and include their documents', async () => {
            // Arrange
            const testData = await createTestData();

            // Act
            const result = await workflowService.createFindQuery(testData.project1.id, {
                namespaceIds: [testData.namespace1.id, testData.namespace2.id]
            }).getMany();

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect((result as WorkflowEntity[]).length).toBe(1);
            expect((result as WorkflowEntity[])[0].id).toBe(testData.workflow3.id);
            expect((result as WorkflowEntity[])[0].documents).toBeDefined();
            expect((result as WorkflowEntity[])[0].documents.length).toBe(1);
            expect((result as WorkflowEntity[])[0].documents[0].id).toBe(testData.document2.id);
        });

        it('should find workflows with a combination of name and namespace filters', async () => {
            // Arrange
            const testData = await createTestData();

            // Act
            const result = await workflowService.createFindQuery(testData.project1.id, {
                name: 'Workflow All Namespaces',
                namespaceIds: [testData.namespace1.id, testData.namespace2.id, testData.namespace3.id]
            }).getMany();

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect((result as WorkflowEntity[]).length).toBe(1);
            expect((result as WorkflowEntity[])[0].id).toBe(testData.workflow4.id);
        });

        it('should return null when no workflow matches the criteria with findOne', async () => {
            // Arrange
            const testData = await createTestData();

            // Act
            const result = await workflowService.createFindQuery(testData.project1.id, {
                name: 'Non-existent Workflow',
            }).getOne();

            // Assert
            expect(result).toBeNull();
        });

        it('should return empty array when no workflows match the criteria', async () => {
            // Arrange
            const testData = await createTestData();

            // Act
            const result = await workflowService.createFindQuery(testData.project1.id, {
                name: 'Non-existent Workflow'
            }).getMany();

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect((result as WorkflowEntity[]).length).toBe(0);
        });

        it('should not find workflows from a different project', async () => {
            // Arrange
            const testData = await createTestData();

            // Act
            const result = await workflowService.createFindQuery(testData.project2.id, {
                namespaceIds: [testData.namespace1.id, testData.namespace2.id]
            }).getMany();

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect((result as WorkflowEntity[]).length).toBe(1);
            expect((result as WorkflowEntity[])[0].id).toBe(testData.workflow6.id);
        });
    });
});