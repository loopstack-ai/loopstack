import {
  clearDatabase,
  setupTestEnvironment,
  TestSetup,
} from '../../__tests__/database-entities-utils';
import { NamespacesService } from '../namespace.service';

describe('NamespacesService', () => {
  let testSetup: TestSetup;
  let namespacesService: NamespacesService;

  beforeAll(async () => {
    testSetup = await setupTestEnvironment({
      databaseName: 'namespace_service_test',
      providers: [NamespacesService],
    });
    namespacesService =
      testSetup.moduleRef.get<NamespacesService>(NamespacesService);
  });

  afterAll(async () => {
    await testSetup.cleanup();
  });

  beforeEach(async () => {
    await clearDatabase(testSetup.dataSource);
  });

  async function createTestData() {
    const { projectRepo, workflowRepo, workspaceRepo, namespaceRepo } =
      testSetup;

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

    // Create parent namespace
    const parentNamespace = namespaceRepo.create({
      name: 'Parent Namespace',
      model: 'test-model',
      workspaceId: workspace.id,
      projectId: project1.id,
      metadata: { key: 'value' },
    });
    await namespaceRepo.save(parentNamespace);

    // Create child namespaces
    const childNamespace1 = namespaceRepo.create({
      name: 'Child Namespace 1',
      model: 'test-model',
      workspaceId: workspace.id,
      projectId: project1.id,
      parent: parentNamespace,
      parentId: parentNamespace.id,
    });
    await namespaceRepo.save(childNamespace1);

    const childNamespace2 = namespaceRepo.create({
      name: 'Child Namespace 2',
      model: 'test-model',
      workspaceId: workspace.id,
      projectId: project1.id,
      parent: parentNamespace,
      parentId: parentNamespace.id,
    });
    await namespaceRepo.save(childNamespace2);

    // Create grandchild namespace
    const grandchildNamespace = namespaceRepo.create({
      name: 'Grandchild Namespace',
      model: 'test-model',
      workspaceId: workspace.id,
      projectId: project1.id,
      parent: childNamespace1,
      parentId: childNamespace1.id,
    });
    await namespaceRepo.save(grandchildNamespace);

    // Create sibling namespace (no parent)
    const siblingNamespace = namespaceRepo.create({
      name: 'Sibling Namespace',
      model: 'test-model',
      workspaceId: workspace.id,
      projectId: project1.id,
    });
    await namespaceRepo.save(siblingNamespace);

    // Create namespace with different model
    const differentModelNamespace = namespaceRepo.create({
      name: 'Different Model',
      model: 'other-model',
      workspaceId: workspace.id,
      projectId: project1.id,
    });
    await namespaceRepo.save(differentModelNamespace);

    // Create workflow for one of the namespaces
    const workflow = workflowRepo.create({
      name: 'Test Workflow',
      place: 'test',
      namespace: childNamespace1,
      labels: [childNamespace1.name],
    });
    await workflowRepo.save(workflow);

    return {
      workspace,
      project1,
      parentNamespace,
      childNamespace1,
      childNamespace2,
      grandchildNamespace,
      siblingNamespace,
      differentModelNamespace,
      workflow,
    };
  }

  describe('findNamespaceIdsByAttributes', () => {
    it('should find namespace IDs by name, model, and workspaceId', async () => {
      // Arrange
      const testData = await createTestData();
      const { workspace, parentNamespace } = testData;

      // Act
      const result = await namespacesService.findNamespaceIdsByAttributes(
        parentNamespace.name,
        parentNamespace.model,
        workspace.id,
      );

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toBe(parentNamespace.id);
    });

    it('should return empty array when no namespaces match criteria', async () => {
      // Arrange
      const testData = await createTestData();

      // Act
      const result = await namespacesService.findNamespaceIdsByAttributes(
        'Non-existent Namespace',
        'test-model',
        testData.workspace.id,
      );

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should find multiple namespace IDs with the same name in different projects', async () => {
      // Arrange
      const testData = await createTestData();
      const { projectRepo, namespaceRepo } = testSetup;

      // Create a second project with a namespace with the same name
      const project2 = projectRepo.create({
        model: 'Project 2',
        title: 'Project 2',
        workspace: testData.workspace,
      });
      await projectRepo.save(project2);

      const duplicateNameNamespace = namespaceRepo.create({
        name: testData.parentNamespace.name, // Same name
        model: testData.parentNamespace.model, // Same model
        workspaceId: testData.workspace.id,
        projectId: project2.id, // Different project
      });
      await namespaceRepo.save(duplicateNameNamespace);

      // Act
      const result = await namespacesService.findNamespaceIdsByAttributes(
        testData.parentNamespace.name,
        testData.parentNamespace.model,
        testData.workspace.id,
      );

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result).toContain(testData.parentNamespace.id);
      expect(result).toContain(duplicateNameNamespace.id);
    });

    it('should only return IDs that match all criteria', async () => {
      // Arrange
      const testData = await createTestData();

      // Act - looking for namespace with correct name but different model
      const result = await namespacesService.findNamespaceIdsByAttributes(
        testData.parentNamespace.name,
        'wrong-model',
        testData.workspace.id,
      );

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('omitNamespacesByNames', () => {
    it('should remove namespaces by names along with their descendants', async () => {
      // Arrange
      const testData = await createTestData();
      const allNamespaces = await testSetup.namespaceRepo.find();

      // Act
      const result = namespacesService.omitNamespacesByNames(
        [testData.parentNamespace.name], // Remove parent
        allNamespaces,
      );

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(allNamespaces.length - 4); // Parent and 3 descendants removed

      // Verify parent and descendants are removed
      expect(
        result.find((n) => n.id === testData.parentNamespace.id),
      ).toBeUndefined();
      expect(
        result.find((n) => n.id === testData.childNamespace1.id),
      ).toBeUndefined();
      expect(
        result.find((n) => n.id === testData.childNamespace2.id),
      ).toBeUndefined();
      expect(
        result.find((n) => n.id === testData.grandchildNamespace.id),
      ).toBeUndefined();

      // Verify other namespaces remain
      expect(
        result.find((n) => n.id === testData.siblingNamespace.id),
      ).toBeDefined();
      expect(
        result.find((n) => n.id === testData.differentModelNamespace.id),
      ).toBeDefined();
    });

    it('should handle removing multiple different namespaces', async () => {
      // Arrange
      const testData = await createTestData();
      const allNamespaces = await testSetup.namespaceRepo.find();

      // Act
      const result = namespacesService.omitNamespacesByNames(
        [testData.siblingNamespace.name, testData.differentModelNamespace.name],
        allNamespaces,
      );

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(allNamespaces.length - 2); // Two namespaces removed

      // Verify removed namespaces
      expect(
        result.find((n) => n.id === testData.siblingNamespace.id),
      ).toBeUndefined();
      expect(
        result.find((n) => n.id === testData.differentModelNamespace.id),
      ).toBeUndefined();

      // Verify remaining namespaces
      expect(
        result.find((n) => n.id === testData.parentNamespace.id),
      ).toBeDefined();
      expect(
        result.find((n) => n.id === testData.childNamespace1.id),
      ).toBeDefined();
      expect(
        result.find((n) => n.id === testData.childNamespace2.id),
      ).toBeDefined();
      expect(
        result.find((n) => n.id === testData.grandchildNamespace.id),
      ).toBeDefined();
    });

    it('should handle non-existent namespace names gracefully', async () => {
      // Arrange
      const testData = await createTestData();
      const allNamespaces = await testSetup.namespaceRepo.find();

      // Act
      const result = namespacesService.omitNamespacesByNames(
        ['Non-existent Namespace'],
        allNamespaces,
      );

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(allNamespaces.length); // No namespaces should be removed
    });

    it('should handle empty names array', async () => {
      // Arrange
      const testData = await createTestData();
      const allNamespaces = await testSetup.namespaceRepo.find();

      // Act
      const result = namespacesService.omitNamespacesByNames([], allNamespaces);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(allNamespaces.length); // No namespaces should be removed
    });

    it('should remove only child namespaces when specified', async () => {
      // Arrange
      const testData = await createTestData();
      const allNamespaces = await testSetup.namespaceRepo.find();

      // Act
      const result = namespacesService.omitNamespacesByNames(
        [testData.childNamespace1.name],
        allNamespaces,
      );

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(allNamespaces.length - 2); // Child and grandchild removed

      // Verify removed namespaces
      expect(
        result.find((n) => n.id === testData.childNamespace1.id),
      ).toBeUndefined();
      expect(
        result.find((n) => n.id === testData.grandchildNamespace.id),
      ).toBeUndefined();

      // Verify remaining namespaces
      expect(
        result.find((n) => n.id === testData.parentNamespace.id),
      ).toBeDefined();
      expect(
        result.find((n) => n.id === testData.childNamespace2.id),
      ).toBeDefined();
      expect(
        result.find((n) => n.id === testData.siblingNamespace.id),
      ).toBeDefined();
      expect(
        result.find((n) => n.id === testData.differentModelNamespace.id),
      ).toBeDefined();
    });
  });
});
