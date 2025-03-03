import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import {NamespacesService} from "../namespace.service";
import {NamespaceEntity} from "../../entities/namespace.entity";
import {DocumentEntity, ProjectEntity, WorkflowEntity, WorkspaceEntity} from "../../entities";
import {ProjectStatus} from "@loopstack/shared";

describe('NamespacesService', () => {
    let pgConnection: DataSource;
    let app: INestApplication;
    let dataSource: DataSource;
    let namespacesService: NamespacesService;
    let namespaceRepo: Repository<NamespaceEntity>;
    let projectRepo: Repository<ProjectEntity>;
    let workspaceRepo: Repository<WorkspaceEntity>;
    let workflowRepo: Repository<WorkflowEntity>;

    const databaseName = 'test_namespaces_service';

    beforeAll(async () => {
        pgConnection = new DataSource({
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            password: 'admin',
            database: 'postgres', // Default database
        });

        await pgConnection.initialize();

        // Create a unique test database
        try {
            await pgConnection.query(`DROP DATABASE IF EXISTS ${databaseName}`);
            await pgConnection.query(`CREATE DATABASE ${databaseName}`);
        } catch (err) {
            console.error('Could not create test database', err);
            throw err;
        }

        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'postgres',
                    host: 'localhost',
                    port: 5432,
                    username: 'postgres',
                    password: 'admin',
                    database: databaseName,
                    entities: [
                        ProjectEntity,
                        WorkspaceEntity,
                        NamespaceEntity,
                        DocumentEntity,
                        WorkflowEntity,
                    ],
                    synchronize: true,
                }),
                TypeOrmModule.forFeature([
                    ProjectEntity,
                    WorkspaceEntity,
                    NamespaceEntity,
                    DocumentEntity,
                    WorkflowEntity,
                ]),
            ],
            providers: [NamespacesService],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();

        dataSource = moduleRef.get<DataSource>(DataSource);
        namespacesService = moduleRef.get<NamespacesService>(NamespacesService);
        namespaceRepo = moduleRef.get<Repository<NamespaceEntity>>(
            getRepositoryToken(NamespaceEntity),
        );
        projectRepo = moduleRef.get<Repository<ProjectEntity>>(
            getRepositoryToken(ProjectEntity),
        );
        workspaceRepo = moduleRef.get<Repository<WorkspaceEntity>>(
            getRepositoryToken(WorkspaceEntity),
        );
        workflowRepo = moduleRef.get<Repository<WorkflowEntity>>(
            getRepositoryToken(WorkflowEntity),
        );
    });

    afterAll(async () => {
        await dataSource.destroy(); // Explicitly destroy connection
        await app.close();

        if (pgConnection && pgConnection.isInitialized) {
            try {
                await pgConnection.query(`DROP DATABASE IF EXISTS ${databaseName}`);
            } finally {
                await pgConnection.destroy();
            }
        }
    });

    beforeEach(async () => {
        // Clear all tables before each test to ensure isolation
        await dataSource.query('TRUNCATE "document" CASCADE');
        await dataSource.query('TRUNCATE "workflow" CASCADE');
        await dataSource.query('TRUNCATE "workflow_namespace" CASCADE');
        await dataSource.query('TRUNCATE "workflow_document" CASCADE');
        await dataSource.query('TRUNCATE "project" CASCADE');
        await dataSource.query('TRUNCATE "namespace" CASCADE');
        await dataSource.query('TRUNCATE "workspace" CASCADE');
    });

    describe('findNamespaceIdsByAttributes', () => {
        it('should return namespace IDs that match the given attributes', async () => {
            // Create a workspace
            const workspace = workspaceRepo.create({
                title: 'Test Workspace',
            });
            await workspaceRepo.save(workspace);

            // Create namespaces with the same name and model but different workspaces
            const namespace1 = namespaceRepo.create({
                name: 'namespace1',
                model: 'model1',
                workspaceId: workspace.id,
                metadata: { key: 'value1' },
            });
            await namespaceRepo.save(namespace1);

            const namespace2 = namespaceRepo.create({
                name: 'namespace2',
                model: 'model1',
                workspaceId: workspace.id,
                metadata: { key: 'value2' },
            });
            await namespaceRepo.save(namespace2);

            // Test finding namespaces by attributes
            const ids = await namespacesService.findNamespaceIdsByAttributes(
                'namespace1',
                'model1',
                workspace.id
            );

            expect(ids).toHaveLength(1);
            expect(ids).toContain(namespace1.id);
            expect(ids).not.toContain(namespace2.id);
        });

        it('should return empty array when no namespaces match the attributes', async () => {
            // Create a workspace
            const workspace = workspaceRepo.create({
                title: 'Test Workspace',
            });
            await workspaceRepo.save(workspace);

            // Create a namespace
            const namespace = namespaceRepo.create({
                name: 'namespace1',
                model: 'model1',
                workspaceId: workspace.id,
            });
            await namespaceRepo.save(namespace);

            // Test finding namespaces with non-existent attributes
            const ids = await namespacesService.findNamespaceIdsByAttributes(
                'non-existent',
                'model1',
                workspace.id
            );

            expect(ids).toHaveLength(0);
        });
    });

    describe('omitNamespacesByNames', () => {
        it('should remove namespaces and their descendants by name', async () => {
            // Create a workspace
            const workspace = workspaceRepo.create({
                title: 'Test Workspace',
            });
            await workspaceRepo.save(workspace);

            // Create namespaces with parent-child relationships
            const parent1 = namespaceRepo.create({
                name: 'parent1',
                model: 'model1',
                workspaceId: workspace.id,
            });
            await namespaceRepo.save(parent1);

            const parent2 = namespaceRepo.create({
                name: 'parent2',
                model: 'model1',
                workspaceId: workspace.id,
            });
            await namespaceRepo.save(parent2);

            const child1 = namespaceRepo.create({
                name: 'child1',
                model: 'model1',
                parentId: parent1.id,
                workspaceId: workspace.id,
            });
            await namespaceRepo.save(child1);

            const child2 = namespaceRepo.create({
                name: 'child2',
                model: 'model1',
                parentId: parent1.id,
                workspaceId: workspace.id,
            });
            await namespaceRepo.save(child2);

            const grandchild = namespaceRepo.create({
                name: 'grandchild',
                model: 'model1',
                parentId: child1.id,
                workspaceId: workspace.id,
            });
            await namespaceRepo.save(grandchild);

            // Get all namespaces
            const allNamespaces = await namespaceRepo.find();
            expect(allNamespaces).toHaveLength(5);

            // Omit parent1 and all its descendants
            const filteredNamespaces = namespacesService.omitNamespacesByNames(
                ['parent1'],
                allNamespaces
            );

            // Should only have parent2 left
            expect(filteredNamespaces).toHaveLength(1);
            expect(filteredNamespaces[0].id).toBe(parent2.id);
        });

        it('should handle multiple namespaces to omit', async () => {
            // Create a workspace
            const workspace = workspaceRepo.create({
                title: 'Test Workspace',
            });
            await workspaceRepo.save(workspace);

            // Create independent namespaces
            const ns1 = namespaceRepo.create({
                name: 'ns1',
                model: 'model1',
                workspaceId: workspace.id,
            });
            await namespaceRepo.save(ns1);

            const ns2 = namespaceRepo.create({
                name: 'ns2',
                model: 'model1',
                workspaceId: workspace.id,
            });
            await namespaceRepo.save(ns2);

            const ns3 = namespaceRepo.create({
                name: 'ns3',
                model: 'model1',
                workspaceId: workspace.id,
            });
            await namespaceRepo.save(ns3);

            // Get all namespaces
            const allNamespaces = await namespaceRepo.find();
            expect(allNamespaces).toHaveLength(3);

            // Omit ns1 and ns3
            const filteredNamespaces = namespacesService.omitNamespacesByNames(
                ['ns1', 'ns3'],
                allNamespaces
            );

            // Should only have ns2 left
            expect(filteredNamespaces).toHaveLength(1);
            expect(filteredNamespaces[0].id).toBe(ns2.id);
        });

        it('should handle non-existent namespace names gracefully', async () => {
            // Create a workspace
            const workspace = workspaceRepo.create({
                title: 'Test Workspace',
            });
            await workspaceRepo.save(workspace);

            // Create namespaces
            const ns1 = namespaceRepo.create({
                name: 'ns1',
                model: 'model1',
                workspaceId: workspace.id,
            });
            await namespaceRepo.save(ns1);

            const ns2 = namespaceRepo.create({
                name: 'ns2',
                model: 'model1',
                workspaceId: workspace.id,
            });
            await namespaceRepo.save(ns2);

            // Get all namespaces
            const allNamespaces = await namespaceRepo.find();
            expect(allNamespaces).toHaveLength(2);

            // Try to omit a non-existent namespace
            const filteredNamespaces = namespacesService.omitNamespacesByNames(
                ['nonexistent'],
                allNamespaces
            );

            // Should still have all namespaces
            expect(filteredNamespaces).toHaveLength(2);
        });
    });

    describe('create', () => {
        it('should create a new namespace when it does not exist', async () => {
            // Create a workspace
            const workspace = workspaceRepo.create({
                title: 'Test Workspace',
            });
            await workspaceRepo.save(workspace);

            const project = await projectRepo.save({
                name: 'Test Project',
                title: 'Test Project',
                status: ProjectStatus.New,
                workspace: workspace,
            });

            const namespaceDto = {
                name: 'new-namespace',
                model: 'model1',
                workspaceId: workspace.id,
                projectId: project.id,
                metadata: { key: 'value' },
            };

            const createdNamespace = await namespacesService.create(namespaceDto);

            expect(createdNamespace).toBeDefined();
            expect(createdNamespace.name).toBe(namespaceDto.name);
            expect(createdNamespace.model).toBe(namespaceDto.model);
            expect(createdNamespace.workspaceId).toBe(namespaceDto.workspaceId);
            expect(createdNamespace.metadata).toEqual(namespaceDto.metadata);

            // Verify it's in the database
            const foundNamespace = await namespaceRepo.findOne({
                where: {
                    name: namespaceDto.name,
                    model: namespaceDto.model,
                    workspaceId: namespaceDto.workspaceId,
                },
            });

            expect(foundNamespace).toBeDefined();
            expect(foundNamespace?.id).toBe(createdNamespace.id);
        });

        it('should update existing namespace metadata when it already exists', async () => {
            // Create a workspace
            const workspace = workspaceRepo.create({
                title: 'Test Workspace',
            });
            await workspaceRepo.save(workspace);

            // Create initial namespace
            const initialNamespace = namespaceRepo.create({
                name: 'existing-namespace',
                model: 'model1',
                workspaceId: workspace.id,
                metadata: { key1: 'value1' },
            });
            await namespaceRepo.save(initialNamespace);

            const project = await projectRepo.save({
                name: 'Test Project',
                title: 'Test Project',
                status: ProjectStatus.New,
                workspace: workspace,
            });

            // Update the namespace with new metadata
            const updateDto = {
                name: 'existing-namespace',
                model: 'model1',
                workspaceId: workspace.id,
                projectId: project.id,
                metadata: { key2: 'value2' },
            };

            const updatedNamespace = await namespacesService.create(updateDto);

            expect(updatedNamespace).toBeDefined();
            expect(updatedNamespace.id).toBe(initialNamespace.id);
            expect(updatedNamespace.metadata).toEqual({
                key1: 'value1',
                key2: 'value2',
            });

            // Verify updates are in the database
            const foundNamespace = await namespaceRepo.findOne({
                where: { id: initialNamespace.id },
            });

            expect(foundNamespace).toBeDefined();
            expect(foundNamespace?.metadata).toEqual({
                key1: 'value1',
                key2: 'value2',
            });
        });

        it('should handle parent-child relationships correctly', async () => {
            // Create a workspace
            const workspace = workspaceRepo.create({
                title: 'Test Workspace',
            });
            await workspaceRepo.save(workspace);

            const project = await projectRepo.save({
                name: 'Test Project',
                title: 'Test Project',
                status: ProjectStatus.New,
                workspace: workspace,
            });

            // Create parent namespace
            const parentNamespaceDto = {
                name: 'parent-namespace',
                model: 'model1',
                workspaceId: workspace.id,
                projectId: project.id,
            };

            const parentNamespace = await namespacesService.create(parentNamespaceDto);

            // Create child namespace
            const childNamespaceDto = {
                name: 'child-namespace',
                model: 'model1',
                workspaceId: workspace.id,
                parentId: parentNamespace.id,
                projectId: project.id,
            };

            const childNamespace = await namespacesService.create(childNamespaceDto);

            expect(childNamespace).toBeDefined();
            expect(childNamespace.parentId).toBe(parentNamespace.id);

            // Verify the relationship in the database
            const foundChild = await namespaceRepo.findOne({
                where: { id: childNamespace.id },
            });

            expect(foundChild).toBeDefined();
            expect(foundChild?.parentId).toBe(parentNamespace.id);
        });

        it('should maintain existing relationships when updating a namespace', async () => {
            // Create a workspace
            const workspace = workspaceRepo.create({
                title: 'Test Workspace',
            });
            await workspaceRepo.save(workspace);

            // Create a project
            const project: ProjectEntity = await projectRepo.save({
                name: 'Test Project',
                title: 'Test Project',
                workspaceId: workspace.id,
            });

            // Create a workflow
            const workflow = workflowRepo.create({
                name: 'Test Workflow',
                place: 'test',
                projectId: project.id,
            });
            await workflowRepo.save(workflow);

            // Create initial namespace with relationships
            const initialNamespace = namespaceRepo.create({
                name: 'related-namespace',
                model: 'model1',
                workspaceId: workspace.id,
            });

            initialNamespace.projects = [project];
            initialNamespace.workflows = [workflow];
            await namespaceRepo.save(initialNamespace);

            // Update the namespace
            const updateDto = {
                name: 'related-namespace',
                model: 'model1',
                workspaceId: workspace.id,
                projectId: project.id,
                metadata: { updated: true },
            };

            await namespacesService.create(updateDto);

            // Verify relationships are maintained
            const updatedNamespace = await namespaceRepo.findOne({
                where: { id: initialNamespace.id },
                relations: ['projects', 'workflows'],
            });

            expect(updatedNamespace).toBeDefined();
            expect(updatedNamespace?.projects).toHaveLength(1);
            expect(updatedNamespace?.workflows).toHaveLength(1);
            expect(updatedNamespace?.projects[0].id).toBe(project.id);
            expect(updatedNamespace?.workflows[0].id).toBe(workflow.id);
            expect(updatedNamespace?.metadata).toEqual({ updated: true });
        });
    });
});