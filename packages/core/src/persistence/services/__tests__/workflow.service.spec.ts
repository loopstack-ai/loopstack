import { WorkflowService } from '../workflow.service';
import {
  clearDatabase,
  setupTestEnvironment,
  TestSetup,
} from '../../__tests__/database-entities-utils';

describe('WorkflowService', () => {
  let testSetup: TestSetup;
  let workflowService: WorkflowService;

  beforeAll(async () => {
    testSetup = await setupTestEnvironment({
      providers: [WorkflowService],
    });
    workflowService = testSetup.moduleRef.get<WorkflowService>(WorkflowService);
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
      name: 'Project 1',
      title: 'Project 1',
      workspace,
    });
    await projectRepo.save(project1);

    // Create multiple namespaces
    const namespace1 = namespaceRepo.create({
      name: 'Namespace 1',
      model: 'test',
      workspaceId: workspace.id,
      projectId: project1.id,
    });
    await namespaceRepo.save(namespace1);

    const namespace2 = namespaceRepo.create({
      name: 'Namespace 2',
      model: 'test',
      workspaceId: workspace.id,
      projectId: project1.id,
    });
    await namespaceRepo.save(namespace2);

    // Create workflows with different configurations
    // Workflow 1: No labels
    let workflow1 = workflowRepo.create({
      name: 'Workflow No Labels',
      place: 'test1',
      namespace: namespace1,
      labels: [],
    });
    workflow1 = await workflowRepo.save(workflow1);

    // Workflow 2: Single label
    let workflow2 = workflowRepo.create({
      name: 'Workflow Single Label',
      place: 'test2',
      namespace: namespace1,
      labels: ['label1'],
    });
    workflow2 = await workflowRepo.save(workflow2);

    // Workflow 3: Multiple labels
    let workflow3 = workflowRepo.create({
      name: 'Workflow Multiple Labels',
      place: 'test3',
      namespace: namespace1,
      labels: ['label1', 'label2', 'label3'],
    });
    workflow3 = await workflowRepo.save(workflow3);

    // Workflow 4: Different namespace
    let workflow4 = workflowRepo.create({
      name: 'Workflow Different Namespace',
      place: 'test4',
      namespace: namespace2,
      labels: ['label1'],
    });
    workflow4 = await workflowRepo.save(workflow4);

    // Workflow 5: Same name as Workflow 2 but different namespace
    let workflow5 = workflowRepo.create({
      name: 'Workflow Single Label',
      place: 'test5',
      namespace: namespace2,
      labels: ['label2'],
    });
    workflow5 = await workflowRepo.save(workflow5);

    // Create documents for each workflow
    const document1 = documentRepo.create({
      name: 'Document 1',
      type: 'text',
      workspaceId: workspace.id,
      projectId: project1.id,
      workflow: workflow1,
      contents: { text: 'Document 1 content' },
      labels: [],
    });
    await documentRepo.save(document1);

    const document2 = documentRepo.create({
      name: 'Document 2',
      type: 'text',
      workspaceId: workspace.id,
      projectId: project1.id,
      workflow: workflow2,
      contents: { text: 'Document 2 content' },
      labels: [],
    });
    await documentRepo.save(document2);

    const document3 = documentRepo.create({
      name: 'Document 3',
      type: 'text',
      workspaceId: workspace.id,
      projectId: project1.id,
      workflow: workflow3,
      contents: { text: 'Document 3 content' },
      labels: [],
    });
    await documentRepo.save(document3);

    const document4 = documentRepo.create({
      name: 'Document 4',
      type: 'text',
      workspaceId: workspace.id,
      projectId: project1.id,
      workflow: workflow4,
      contents: { text: 'Document 4 content' },
      labels: [],
    });
    await documentRepo.save(document4);

    const document5 = documentRepo.create({
      name: 'Document 5',
      type: 'text',
      workspaceId: workspace.id,
      projectId: project1.id,
      workflow: workflow5,
      contents: { text: 'Document 5 content' },
      labels: [],
    });
    await documentRepo.save(document5);

    return {
      project1,
      namespace1,
      namespace2,
      workflow1,
      workflow2,
      workflow3,
      workflow4,
      workflow5,
      document1,
      document2,
      document3,
      document4,
      document5,
    };
  }

  describe('createFindQuery', () => {
    it('should find all workflows for a namespace without filtering', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const result = await workflowService
          .createFindQuery(testData.namespace1.id)
          .getMany();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3); // All workflows in namespace1
      expect(result.map((w) => w.id)).toContain(testData.workflow1.id);
      expect(result.map((w) => w.id)).toContain(testData.workflow2.id);
      expect(result.map((w) => w.id)).toContain(testData.workflow3.id);
      expect(result.map((w) => w.id)).not.toContain(testData.workflow4.id); // Different namespace
      expect(result.map((w) => w.id)).not.toContain(testData.workflow5.id); // Different namespace
    });

    it('should filter workflows by name', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const result = await workflowService
          .createFindQuery(testData.namespace1.id, {
            name: 'Workflow Single Label',
          })
          .getMany();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(testData.workflow2.id);
      expect(result[0].name).toBe('Workflow Single Label');
    });

    it('should filter workflows by empty labels array', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const result = await workflowService
          .createFindQuery(testData.namespace1.id, {
            labels: [],
          })
          .getMany();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(testData.workflow1.id);
      expect(result[0].labels).toEqual([]);
    });

    it('should filter workflows by specific label', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const result = await workflowService
          .createFindQuery(testData.namespace1.id, {
            labels: ['label1'],
          })
          .getMany();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(testData.workflow2.id);
      expect(result[0].labels).toEqual(['label1']);
    });

    it('should filter workflows by multiple labels with exact match', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const result = await workflowService
          .createFindQuery(testData.namespace1.id, {
            labels: ['label1', 'label2', 'label3'],
          })
          .getMany();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(testData.workflow3.id);
      expect(result[0].labels).toEqual(['label1', 'label2', 'label3']);
    });

    it('should return no results for non-existent name', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const result = await workflowService
          .createFindQuery(testData.namespace1.id, {
            name: 'Non-existent Workflow',
          })
          .getMany();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return no results for non-matching labels filter', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const result = await workflowService
          .createFindQuery(testData.namespace1.id, {
            labels: ['non-existent-label'],
          })
          .getMany();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should combine name and labels filters', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const result = await workflowService
          .createFindQuery(testData.namespace1.id, {
            name: 'Workflow Multiple Labels',
            labels: ['label1', 'label2', 'label3'],
          })
          .getMany();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(testData.workflow3.id);
    });

    it('should return no results when filters conflict', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const result = await workflowService
          .createFindQuery(testData.namespace1.id, {
            name: 'Workflow No Labels',
            labels: ['label1'], // This workflow has no labels
          })
          .getMany();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should include related documents in the query result', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const result = await workflowService
          .createFindQuery(testData.namespace1.id, {
            name: 'Workflow Multiple Labels',
          })
          .getMany();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].documents).toBeDefined();
      expect(result[0].documents.length).toBe(1);
      expect(result[0].documents[0].id).toBe(testData.document3.id);
      expect(result[0].documents[0].name).toBe('Document 3');
    });

    it('should return no results for non-existent namespace', async () => {
      // Arrange
      await createTestData();
      const nonExistentNamespaceId = '00000000-0000-0000-0000-000000000000';

      // Act
      const result = await workflowService
          .createFindQuery(nonExistentNamespaceId)
          .getMany();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});