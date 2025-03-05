import {DocumentService} from "../document.service";
import {clearDatabase, setupTestEnvironment, TestSetup} from "../../__tests__/database-entities-utils";

describe('Document Service Tests', () => {
    let testSetup: TestSetup;
    let documentService: DocumentService;

    beforeAll(async () => {
        testSetup = await setupTestEnvironment({
            providers: [DocumentService]
        });
        documentService = testSetup.moduleRef.get<DocumentService>(DocumentService);
    });

    afterAll(async () => {
        await testSetup.cleanup();
    });

    beforeEach(async () => {
        await clearDatabase(testSetup.dataSource);
    });

    // Helper function to setup test data
    async function setupTestData() {
        const {
            projectRepo,
            workflowRepo,
            workspaceRepo,
            namespaceRepo,
            documentRepo,
        } = testSetup;

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

        // Create namespaces
        const namespace1 = namespaceRepo.create({
            name: 'Namespace 1',
            workspaceId: workspace.id,
            model: 'model1',
        });
        await namespaceRepo.save(namespace1);

        const namespace2 = namespaceRepo.create({
            name: 'Namespace 2',
            workspaceId: workspace.id,
            model: 'model1',
        });
        await namespaceRepo.save(namespace2);

        const namespace3 = namespaceRepo.create({
            name: 'Namespace 3',
            workspaceId: workspace.id,
            model: 'model1',
        });
        await namespaceRepo.save(namespace3);

        // Create workflows with different namespace combinations
        // Workflow 1 with namespace1 and namespace2
        const workflow1 = workflowRepo.create({
            name: 'Workflow 1',
            place: 'test',
            project,
            namespace: namespace2,
            namespaceIds: [namespace1.id, namespace2.id],
        });
        await workflowRepo.save(workflow1);

        // Workflow 2 with namespace2 and namespace3
        const workflow2 = workflowRepo.create({
            name: 'Workflow 2',
            place: 'test',
            project,
            namespace: namespace3,
            namespaceIds: [namespace2.id, namespace3.id],
        });
        await workflowRepo.save(workflow2);

        // Workflow 3 with all namespaces
        const workflow3 = workflowRepo.create({
            name: 'Workflow 3',
            place: 'test',
            project,
            namespace: namespace3,
            namespaceIds: [namespace1.id, namespace2.id, namespace3.id],
        });
        await workflowRepo.save(workflow3);

        // Create documents with the same name in different workflows
        const document1 = documentRepo.create({
            name: 'Common Document',
            type: 'text',
            workspaceId: workspace.id,
            projectId: project.id,
            workflow: workflow1,
            contents: { text: 'Content 1' },
            isInvalidated: false,
            workflowIndex: 1,
        });
        await documentRepo.save(document1);

        const document2 = documentRepo.create({
            name: 'Common Document',
            type: 'text',
            workspaceId: workspace.id,
            projectId: project.id,
            workflow: workflow2,
            contents: { text: 'Content 2' },
            isInvalidated: false,
            workflowIndex: 2,
        });
        await documentRepo.save(document2);

        const document3 = documentRepo.create({
            name: 'Common Document',
            type: 'text',
            workspaceId: workspace.id,
            projectId: project.id,
            workflow: workflow3,
            contents: { text: 'Content 3' },
            isInvalidated: false,
            workflowIndex: 3,
        });
        await documentRepo.save(document3);

        // Create another document with a different name
        const document4 = documentRepo.create({
            name: 'Different Document',
            type: 'text',
            workspaceId: workspace.id,
            projectId: project.id,
            workflow: workflow1,
            contents: { text: 'Content 4' },
            isInvalidated: false,
            workflowIndex: 4,
        });
        await documentRepo.save(document4);

        // Create an invalidated document
        const document5 = documentRepo.create({
            name: 'Invalidated Document',
            type: 'text',
            workspaceId: workspace.id,
            projectId: project.id,
            workflow: workflow1,
            contents: { text: 'Content 5' },
            isInvalidated: true,
            workflowIndex: 5,
        });
        await documentRepo.save(document5);

        return {
            workspace,
            project,
            namespace1,
            namespace2,
            namespace3,
            workflow1,
            workflow2,
            workflow3,
            document1,
            document2,
            document3,
            document4,
            document5
        };
    }

    describe('findDocumentsByNameInAllNamespaces', () => {
        it('should find documents by name in workflows containing ALL specified namespaces', async () => {
            const { project, workspace, namespace1, namespace2, namespace3 } = await setupTestData();

            // Find documents with name "Common Document" in workflows containing both namespace1 and namespace2
            const documents = await documentService.createDocumentsQuery(
                project.id,
                workspace.id,
                {
                    name: 'Common Document',
                },
                {
                    namespaceIds: [namespace1.id, namespace2.id],
                }
            ).getMany();

            // Should find document1 and document3 since their workflows contain both namespaces
            expect(documents.length).toBe(2);
            const contentTexts = documents.map(d => d.contents.text);
            expect(contentTexts).toContain('Content 1');
            expect(contentTexts).toContain('Content 3');
        });

        it('should find only documents in workflows containing all three namespaces', async () => {
            const { project, workspace, namespace1, namespace2, namespace3 } = await setupTestData();

            // Find documents with name "Common Document" in workflows containing all three namespaces
            const documents = await documentService.createDocumentsQuery(
                project.id,
                workspace.id,
                {
                    name: 'Common Document',
                },
                {
                    namespaceIds: [namespace1.id, namespace2.id, namespace3.id],
                }
            ).getMany();

            // Should find only document3 since only workflow3 contains all three namespaces
            expect(documents.length).toBe(1);
            expect(documents[0].contents.text).toBe('Content 3');
        });

        it('should return an empty array if no workflows contain all specified namespaces', async () => {
            const {
                workspaceRepo,
                namespaceRepo,
            } = testSetup;
            const { project, workspace,  namespace1, namespace3 } = await setupTestData();

            // Create a new namespace that isn't associated with any workflow
            const newNamespace = namespaceRepo.create({
                name: 'New Namespace',
                model: 'model1',
                workspaceId: await workspaceRepo.findOne({ where: {} }).then(ws => ws?.id),
            });
            await namespaceRepo.save(newNamespace);

            const documents = await documentService.createDocumentsQuery(
                project.id,
                workspace.id,
                {
                    name: 'Common Document',
                },
                {
                    namespaceIds: [namespace1.id, namespace3.id, newNamespace.id],
                }
            ).getMany();

            expect(documents).toEqual([]);
        });
    });

    describe('createQuery', () => {
        it('should create a query builder with basic filters', async () => {
            const { project, workspace } = await setupTestData();

            const queryBuilder = documentService.createDocumentsQuery(
                project.id,
                workspace.id,
                {
                    name: 'Common Document',
                },
            );

            const documents = await queryBuilder.getMany();

            // Should find 3 non-invalidated documents with name "Common Document"
            expect(documents.length).toBe(3);
        });

        it('should filter by document type', async () => {
            const {
                workflowRepo,
                documentRepo,
            } = testSetup;
            const { project, workspace } = await setupTestData();

            // Create a document with a different type
            const workflow = await workflowRepo.findOne({ where: {} });
            const differentTypeDoc = documentRepo.create({
                name: 'Common Document',
                type: 'image',
                workspaceId: workspace.id,
                projectId: project.id,
                workflow: workflow!,
                contents: { text: 'Image content' },
                isInvalidated: false,
                workflowIndex: 10,
            });
            await documentRepo.save(differentTypeDoc);

            const queryBuilder = documentService.createDocumentsQuery(
                project.id,
                workspace.id,
                {
                    name: 'Common Document',
                    type: 'text',
                },
            );

            const documents = await queryBuilder.getMany();

            // Should find 3 text documents, not the image document
            expect(documents.length).toBe(3);
            documents.forEach(doc => {
                expect(doc.type).toBe('text');
            });
        });

        it('should exclude invalidated documents', async () => {
            const { project, workspace } = await setupTestData();

            const queryBuilder = documentService.createDocumentsQuery(
                project.id,
                workspace.id,
                {
                    name: 'Invalidated Document',
                },
            );

            const documents = await queryBuilder.getMany();

            // Should find 0 documents since the only matching one is invalidated
            expect(documents.length).toBe(0);
        });

        it('should filter by workflow index', async () => {
            const { project, workspace } = await setupTestData();

            const queryBuilder = documentService.createDocumentsQuery(
                project.id,
                workspace.id,
                {
                    name: 'Common Document',
                },
                {
                    ltWorkflowIndex: 3,
                },
            );

            const documents = await queryBuilder.getMany();

            // Should find documents with workflow_index < 3
            expect(documents.length).toBe(2);
            documents.forEach(doc => {
                expect(doc.workflowIndex).toBeLessThan(3);
            });
        });

        it('should filter by namespaces', async () => {
            const { project, workspace, namespace1 } = await setupTestData();

            const queryBuilder = documentService.createDocumentsQuery(
                project.id,
                workspace.id,
                {
                    name: 'Common Document',
                },
                {
                    namespaceIds: [namespace1.id],
                },
            );

            const documents = await queryBuilder.getMany();

            // Should find documents in workflows containing namespace1
            expect(documents.length).toBe(2);
        });

        it('should order documents by workflow_index DESC', async () => {
            const { project, workspace } = await setupTestData();

            const queryBuilder = documentService.createDocumentsQuery(
                project.id,
                workspace.id,
                {
                    name: 'Common Document',
                },
            );

            const documents = await queryBuilder.getMany();

            // Should be ordered by workflow_index DESC
            expect(documents.length).toBe(3);
            expect(documents[0].workflowIndex).toBe(3);
            expect(documents[1].workflowIndex).toBe(2);
            expect(documents[2].workflowIndex).toBe(1);
        });

        it('should use global scope when isGlobal is true', async () => {
            const {
                projectRepo,
                workflowRepo,
                documentRepo,
            } = testSetup;
            const { project, workspace } = await setupTestData();

            // Create a second project in the same workspace
            const project2 = projectRepo.create({
                name: 'Test Project 2',
                title: 'Test Project 2',
                workspaceId: workspace.id,
            });
            await projectRepo.save(project2);

            // Create a workflow in the second project
            const workflow = workflowRepo.create({
                name: 'Workflow in Project 2',
                place: 'test',
                project: project2,
            });
            await workflowRepo.save(workflow);

            // Create a document in the second project
            const document = documentRepo.create({
                name: 'Common Document',
                type: 'text',
                workspaceId: workspace.id,
                projectId: project2.id,
                workflow,
                contents: { text: 'Project 2 content' },
                isInvalidated: false,
                workflowIndex: 10,
            });
            await documentRepo.save(document);

            // Query with isGlobal = true should include documents from all projects in the workspace
            const queryBuilder = documentService.createDocumentsQuery(
                project.id, // Original project ID
                workspace.id,
                {
                    name: 'Common Document',
                },
                {
                    isGlobal: true,
                },
            );

            const documents = await queryBuilder.getMany();

            // Should find 4 documents (3 from original project + 1 from project2)
            expect(documents.length).toBe(4);

            // Check that we have documents from both projects
            const projectIds = [...new Set(documents.map(d => d.projectId))];
            expect(projectIds.length).toBe(2);
            expect(projectIds).toContain(project.id);
            expect(projectIds).toContain(project2.id);
        });
    });

    describe('create', () => {
        it('should create a document entity without saving it', async () => {
            const {
                documentRepo,
            } = testSetup;
            const { project, workspace, workflow1 } = await setupTestData();

            const documentDto = {
                name: 'New Document',
                type: 'text',
                workspaceId: workspace.id,
                projectId: project.id,
                workflow: workflow1,
                contents: { text: 'New content' },
            };

            const document = documentService.create(documentDto);

            // The document should be created but not saved
            expect(document).toBeDefined();
            expect(document.name).toBe('New Document');
            expect(document.id).toBeUndefined(); // Not saved, so no ID

            // Verify it's not in the database
            const foundDocument = await documentRepo.findOne({
                where: { name: 'New Document' },
            });
            expect(foundDocument).toBeNull();
        });
    });
});