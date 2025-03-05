import { DocumentService } from '../document.service';
import {
  clearDatabase,
  setupTestEnvironment,
  TestSetup,
} from '../../__tests__/database-entities-utils';

describe('DocumentService', () => {
  let testSetup: TestSetup;
  let documentService: DocumentService;

  beforeAll(async () => {
    testSetup = await setupTestEnvironment({
      databaseName: 'document_service_test',
      providers: [DocumentService],
    });
    documentService = testSetup.moduleRef.get<DocumentService>(DocumentService);
  });

  afterAll(async () => {
    await testSetup.cleanup();
  });

  beforeEach(async () => {
    await clearDatabase(testSetup.dataSource);
  });

  async function createTestData() {
    const {
      projectRepo,
      workflowRepo,
      workspaceRepo,
      namespaceRepo,
      documentRepo,
    } = testSetup;

    const workspace = await workspaceRepo.save({
      name: 'Test Workspace',
      title: 'Test Workspace',
    });

    const project1 = projectRepo.create({
      model: 'Project 1',
      title: 'Project 1',
      workspace,
    });
    await projectRepo.save(project1);

    const project2 = projectRepo.create({
      model: 'Project 2',
      title: 'Project 2',
      workspace,
    });
    await projectRepo.save(project2);

    const namespace1 = namespaceRepo.create({
      name: 'Namespace 1',
      model: 'test',
      workspaceId: workspace.id,
      projectId: project1.id,
    });
    await namespaceRepo.save(namespace1);

    const workflow1 = await workflowRepo.save(workflowRepo.create({
      name: 'Workflow 1',
      place: 'test1',
      namespace: namespace1,
      labels: ['label1', 'label2'],
    }));

    const workflow2 = await workflowRepo.save(workflowRepo.create({
      name: 'Workflow 2',
      place: 'test2',
      namespace: namespace1,
      labels: ['label3', 'label4'],
    }));

    // Create documents for Project 1
    const document1 = documentRepo.create({
      name: 'Document 1',
      type: 'text',
      workspaceId: workspace.id,
      projectId: project1.id,
      workflow: workflow1,
      workflowIndex: 1,
      labels: ['label1', 'label2'],
      contents: { text: 'Document 1 content' },
    });
    await documentRepo.save(document1);

    const document2 = documentRepo.create({
      name: 'Document 2',
      type: 'image',
      workspaceId: workspace.id,
      projectId: project1.id,
      workflow: workflow1,
      workflowIndex: 2,
      labels: ['label1', 'label3'],
      contents: { url: 'image-url' },
    });
    await documentRepo.save(document2);

    const document3 = documentRepo.create({
      name: 'Document 1', // Same name as document1 but different type
      type: 'pdf',
      workspaceId: workspace.id,
      projectId: project1.id,
      workflow: workflow2,
      workflowIndex: 3,
      labels: ['label3', 'label4'],
      contents: { url: 'pdf-url' },
    });
    await documentRepo.save(document3);

    // Create an invalidated document
    const document4 = documentRepo.create({
      name: 'Document Invalidated',
      type: 'text',
      workspaceId: workspace.id,
      projectId: project1.id,
      workflow: workflow1,
      workflowIndex: 4,
      labels: ['label1', 'label2'],
      isInvalidated: true,
      contents: { text: 'Invalid content' },
    });
    await documentRepo.save(document4);

    // Create a document for Project 2 (for global search testing)
    const document5 = documentRepo.create({
      name: 'Document 1', // Same name as document1 but different project
      type: 'text',
      workspaceId: workspace.id,
      projectId: project2.id,
      workflow: workflow1,
      workflowIndex: 5,
      labels: ['label1', 'label2'],
      contents: { text: 'Document from Project 2' },
    });
    await documentRepo.save(document5);

    return {
      workspace,
      project1,
      project2,
      namespace1,
      workflow1,
      workflow2,
      document1,
      document2,
      document3,
      document4,
      document5,
    };
  }

  describe('createDocumentsQuery', () => {
    it('should find documents by name within a project', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const query = documentService.createDocumentsQuery(
          testData.project1.id,
          testData.workspace.id,
          { name: 'Document 1' }
      );
      const result = await query.getMany();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // document1 and document3 have the same name
      expect(result.map(d => d.id)).toContain(testData.document1.id);
      expect(result.map(d => d.id)).toContain(testData.document3.id);
      expect(result.map(d => d.id)).not.toContain(testData.document5.id); // Different project
    });

    it('should find documents by name and type', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const query = documentService.createDocumentsQuery(
          testData.project1.id,
          testData.workspace.id,
          { name: 'Document 1', type: 'text' }
      );
      const result = await query.getMany();

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(testData.document1.id);
    });

    it('should exclude invalidated documents', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const query = documentService.createDocumentsQuery(
          testData.project1.id,
          testData.workspace.id,
          { name: 'Document Invalidated' }
      );
      const result = await query.getMany();

      // Assert
      expect(result.length).toBe(0); // document4 is invalidated
    });

    it('should filter by workflow index', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const query = documentService.createDocumentsQuery(
          testData.project1.id,
          testData.workspace.id,
          undefined,
          { ltWorkflowIndex: 3 }
      );
      const result = await query.getMany();

      // Assert
      expect(result.length).toBe(2);
      expect(result[1].name).toBe(testData.document1.name);
      expect(result[0].name).toBe(testData.document2.name);
    });

    it('should find documents across workspaces when isGlobal is true', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const query = documentService.createDocumentsQuery(
          testData.project1.id,
          testData.workspace.id,
          { name: 'Document 1' },
          { isGlobal: true }
      );
      const result = await query.getMany();

      // Assert
      expect(result.length).toBe(3); // document1, document3, and document5
      expect(result.map(d => d.id)).toContain(testData.document1.id);
      expect(result.map(d => d.id)).toContain(testData.document3.id);
      expect(result.map(d => d.id)).toContain(testData.document5.id);
    });

    it('should filter by labels', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const query = documentService.createDocumentsQuery(
          testData.project1.id,
          testData.workspace.id,
          undefined,
          { labels: ['label1', 'label2'] }
      );
      const result = await query.getMany();

      // Assert
      expect(result.length).toBe(1); // Only document1 has both label1 and label2
      expect(result[0].id).toBe(testData.document1.id);
    });

    it('should order results by workflow_index in descending order', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const query = documentService.createDocumentsQuery(
          testData.project1.id,
          testData.workspace.id,
          undefined
      );
      const result = await query.getMany();

      // Assert
      expect(result.length).toBe(3); // document1, document2, document3
      // Check ordering
      expect(result[0].workflowIndex).toBeGreaterThan(result[1].workflowIndex);
      expect(result[1].workflowIndex).toBeGreaterThan(result[2].workflowIndex);
    });

    it('should combine multiple filter conditions correctly', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const query = documentService.createDocumentsQuery(
          testData.project1.id,
          testData.workspace.id,
          undefined,
          {
            labels: ['label1'],
            ltWorkflowIndex: 3
          }
      );
      const result = await query.getMany();

      // Assert
      expect(result.length).toBe(2); // document1 and document2
      expect(result.map(d => d.id)).toContain(testData.document1.id);
      expect(result.map(d => d.id)).toContain(testData.document2.id);
      expect(result.map(d => d.id)).not.toContain(testData.document3.id); // workflow_index = 3
    });
  });
});