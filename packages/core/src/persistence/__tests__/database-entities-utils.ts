import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import {DocumentEntity, NamespaceEntity, ProjectEntity, WorkflowEntity, WorkspaceEntity} from "../entities";

export interface TestSetup {
    moduleRef: TestingModule;
    app: INestApplication;
    dataSource: DataSource;
    projectRepo: Repository<ProjectEntity>;
    workflowRepo: Repository<WorkflowEntity>;
    workspaceRepo: Repository<WorkspaceEntity>;
    namespaceRepo: Repository<NamespaceEntity>;
    documentRepo: Repository<DocumentEntity>;
    cleanup: () => Promise<void>;
}

interface TestSetupOptions {
    databaseName?: string;
    providers?: any[];
}

export async function setupTestEnvironment(options: TestSetupOptions = {}): Promise<TestSetup> {
    const databaseName = options.databaseName || `test_db_${Date.now()}`;

    const pgConnection = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'admin',
        database: 'postgres',
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
        providers: [...(options.providers || [])],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const dataSource = moduleRef.get<DataSource>(DataSource);
    const projectRepo = moduleRef.get<Repository<ProjectEntity>>(getRepositoryToken(ProjectEntity));
    const workflowRepo = moduleRef.get<Repository<WorkflowEntity>>(getRepositoryToken(WorkflowEntity));
    const workspaceRepo = moduleRef.get<Repository<WorkspaceEntity>>(getRepositoryToken(WorkspaceEntity));
    const namespaceRepo = moduleRef.get<Repository<NamespaceEntity>>(getRepositoryToken(NamespaceEntity));
    const documentRepo = moduleRef.get<Repository<DocumentEntity>>(getRepositoryToken(DocumentEntity));

    return {
        moduleRef,
        app,
        dataSource,
        projectRepo,
        workflowRepo,
        workspaceRepo,
        namespaceRepo,
        documentRepo,
        cleanup: async () => {
            await dataSource.destroy();
            await app.close();
            if (pgConnection && pgConnection.isInitialized) {
                try {
                    await pgConnection.query(`DROP DATABASE IF EXISTS ${databaseName}`);
                } finally {
                    await pgConnection.destroy();
                }
            }
        },
    };
}

export async function clearDatabase(dataSource: DataSource) {
    await dataSource.query('TRUNCATE "document" CASCADE');
    await dataSource.query('TRUNCATE "workflow" CASCADE');
    await dataSource.query('TRUNCATE "workflow_namespace" CASCADE');
    await dataSource.query('TRUNCATE "workflow_document" CASCADE');
    await dataSource.query('TRUNCATE "project" CASCADE');
    await dataSource.query('TRUNCATE "namespace" CASCADE');
    await dataSource.query('TRUNCATE "workspace" CASCADE');
}
