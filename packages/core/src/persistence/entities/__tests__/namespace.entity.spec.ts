import { WorkspaceEntity } from '../workspace.entity';
import { NamespaceEntity } from '../namespace.entity';
import { WorkflowEntity } from '../workflow.entity';
import {clearDatabase, setupTestEnvironment, TestSetup} from "../../__tests__/database-entities-utils";

describe('Namespace Entity Deletion Tests', () => {
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

  describe('Namespace parent-child relationship tests', () => {
    let workspace: WorkspaceEntity;
    let parentNamespace: NamespaceEntity;
    let childNamespace1: NamespaceEntity;
    let childNamespace2: NamespaceEntity;

    beforeEach(async () => {
      const {
        workspaceRepo,
        namespaceRepo,
      } = testSetup;

      // Create a workspace
      workspace = workspaceRepo.create({
        title: 'Test Workspace',
      });
      await workspaceRepo.save(workspace);

      // Create parent namespace
      parentNamespace = namespaceRepo.create({
        name: 'Parent Namespace',
        model: 'test-model',
        workspaceId: workspace.id,
        metadata: { test: 'data' },
      });
      await namespaceRepo.save(parentNamespace);

      // Create child namespaces
      childNamespace1 = namespaceRepo.create({
        name: 'Child Namespace 1',
        model: 'test-model',
        workspaceId: workspace.id,
        parentId: parentNamespace.id,
        metadata: { child: 'data1' },
      });
      await namespaceRepo.save(childNamespace1);

      childNamespace2 = namespaceRepo.create({
        name: 'Child Namespace 2',
        model: 'test-model',
        workspaceId: workspace.id,
        parentId: parentNamespace.id,
        metadata: { child: 'data2' },
      });
      await namespaceRepo.save(childNamespace2);
    });

    it('should set parentId to null for children when parent namespace is deleted', async () => {
      const {
        namespaceRepo,
      } = testSetup;

      // Delete the parent namespace
      await namespaceRepo.delete(parentNamespace.id);

      // Verify parent namespace is deleted
      const parentResult = await namespaceRepo.findOne({
        where: { id: parentNamespace.id },
      });
      expect(parentResult).toBeNull();

      // Verify child namespaces still exist but have null parentId
      const child1 = await namespaceRepo.findOne({
        where: { id: childNamespace1.id },
      });
      const child2 = await namespaceRepo.findOne({
        where: { id: childNamespace2.id },
      });

      expect(child1).not.toBeNull();
      expect(child2).not.toBeNull();
      expect(child1!.parentId).toBeNull();
      expect(child2!.parentId).toBeNull();
    });

    it('should not affect parent when child namespace is deleted', async () => {
      const {
        namespaceRepo,
      } = testSetup;

      // Delete a child namespace
      await namespaceRepo.delete(childNamespace1.id);

      // Verify child is deleted
      const deletedChild = await namespaceRepo.findOne({
        where: { id: childNamespace1.id },
      });
      expect(deletedChild).toBeNull();

      // Verify parent namespace is unchanged
      const parent = await namespaceRepo.findOne({
        where: { id: parentNamespace.id },
        relations: ['children'],
      });

      expect(parent).not.toBeNull();
      expect(parent!.children.length).toBe(1);
      expect(parent!.children[0].id).toBe(childNamespace2.id);
    });
  });

  describe('Namespace to workspace relationship tests', () => {
    let workspace: WorkspaceEntity;
    let namespace: NamespaceEntity;

    beforeEach(async () => {
      const {
        workspaceRepo,
        namespaceRepo,
      } = testSetup;

      // Create a workspace
      workspace = workspaceRepo.create({
        title: 'Test Workspace',
      });
      await workspaceRepo.save(workspace);

      // Create namespace in the workspace
      namespace = namespaceRepo.create({
        name: 'Test Namespace',
        model: 'test-model',
        workspaceId: workspace.id,
        metadata: { test: 'data' },
      });
      await namespaceRepo.save(namespace);
    });

    it('should not delete workspace when namespace is deleted', async () => {
      const {
        workspaceRepo,
        namespaceRepo,
      } = testSetup;
      // Delete the namespace
      await namespaceRepo.delete(namespace.id);

      // Verify namespace is deleted
      const namespaceResult = await namespaceRepo.findOne({
        where: { id: namespace.id },
      });
      expect(namespaceResult).toBeNull();

      // Verify workspace still exists
      const workspaceResult = await workspaceRepo.findOne({
        where: { id: workspace.id },
      });
      expect(workspaceResult).not.toBeNull();
      expect(workspaceResult!.id).toBe(workspace.id);
    });
  });

  describe('Namespace to workflow relationship tests', () => {
    let workspace: WorkspaceEntity;
    let namespace: NamespaceEntity;
    let workflow: WorkflowEntity;

    beforeEach(async () => {
      const {
        workflowRepo,
        workspaceRepo,
        namespaceRepo,
      } = testSetup;

      // Create a workspace
      workspace = workspaceRepo.create({
        title: 'Test Workspace',
      });
      await workspaceRepo.save(workspace);

      // Create namespace
      namespace = namespaceRepo.create({
        name: 'Test Namespace',
        model: 'test-model',
        workspaceId: workspace.id,
        metadata: { test: 'data' },
      });
      await namespaceRepo.save(namespace);

      // Create workflow
      workflow = workflowRepo.create({
        name: 'Test Workflow',
        place: 'initial',
        index: 0,
        namespaces: [namespace],
      });
      await workflowRepo.save(workflow);
    });

    it('should remove the relation when namespace is deleted but keep workflow', async () => {
      const {
        workflowRepo,
        namespaceRepo,
      } = testSetup;

      // Delete the namespace
      await namespaceRepo.delete(namespace.id);

      // Verify namespace is deleted
      const namespaceResult = await namespaceRepo.findOne({
        where: { id: namespace.id },
      });
      expect(namespaceResult).toBeNull();

      // Verify workflow still exists
      const workflowResult = await workflowRepo.findOne({
        where: { id: workflow.id },
      });
      expect(workflowResult).not.toBeNull();

      // Verify relation is removed
      const relation = await testSetup.dataSource.query(
        'SELECT * FROM workflow_namespace WHERE namespace_id = $1',
        [namespace.id],
      );
      expect(relation.length).toBe(0);
    });

    it('should remove the relation when workflow is deleted but keep namespace', async () => {
      const {
        workflowRepo,
        namespaceRepo,
      } = testSetup;

      // Delete the workflow
      await workflowRepo.delete(workflow.id);

      // Verify workflow is deleted
      const workflowResult = await workflowRepo.findOne({
        where: { id: workflow.id },
      });
      expect(workflowResult).toBeNull();

      // Verify namespace still exists
      const namespaceResult = await namespaceRepo.findOne({
        where: { id: namespace.id },
      });
      expect(namespaceResult).not.toBeNull();

      // Verify relation is removed
      const relation = await testSetup.dataSource.query(
        'SELECT * FROM workflow_namespace WHERE workflow_id = $1',
        [workflow.id],
      );
      expect(relation.length).toBe(0);
    });
  });
});
