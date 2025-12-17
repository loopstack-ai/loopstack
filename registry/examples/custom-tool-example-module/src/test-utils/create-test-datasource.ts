import { DataSource } from 'typeorm';
import { createConfiguredPgMem } from '../jest.globalSetup';

/**
 * Creates an in-memory PostgreSQL database using pg-mem
 * and returns an initialized TypeORM DataSource.
 *
 * Uses the shared pg-mem configuration from jest.globalSetup
 * which has all necessary PostgreSQL functions and extensions registered.
 */
export async function createTestDataSource(): Promise<DataSource> {
  const db = createConfiguredPgMem();

  const dataSource: DataSource = await db.adapters.createTypeormDataSource({
    type: 'postgres',
  });

  await dataSource.initialize();
  await dataSource.synchronize();

  return dataSource;
}
