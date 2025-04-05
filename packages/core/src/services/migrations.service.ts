import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EnableLtreeExtension1742827301075 } from '../migrations/1742827301075-EnableLtreeExtension';

@Injectable()
export class MigrationsService implements OnModuleInit {
  private readonly logger = new Logger(MigrationsService.name);

  constructor(private dataSource: DataSource) {}

  async onModuleInit() {
    // if (process.env.RUN_MIGRATIONS === 'true') {
    await this.runMigrations();
    // }
  }

  async runMigrations() {
    this.logger.log('Running migrations...');

    try {
      const allMigrations = [EnableLtreeExtension1742827301075];

      const queryRunner = this.dataSource.createQueryRunner();

      for (const Migration of allMigrations) {
        const migration = new Migration();
        const name = Migration.name;

        this.logger.log(`Running migration: ${name}`);

        try {
          await queryRunner.manager.query(`
            CREATE TABLE IF NOT EXISTS migrations (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL UNIQUE,
              timestamp BIGINT NOT NULL,
              applied_at TIMESTAMP DEFAULT NOW()
            )
          `);

          const existingMigration = await queryRunner.manager
            .query(`SELECT * FROM migrations WHERE name = $1`, [name])
            .catch(() => null);

          if (!existingMigration && existingMigration !== null) {
            await queryRunner.manager.query(`
              CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                timestamp BIGINT NOT NULL,
                applied_at TIMESTAMP DEFAULT NOW()
              )
            `);
          }

          if (!existingMigration || existingMigration.length === 0) {
            await migration.up(queryRunner);

            await queryRunner.manager.query(
              `INSERT INTO migrations (name, timestamp) VALUES ($1, $2)`,
              [name, Date.now()],
            );

            this.logger.log(`Migration applied: ${name}`);
          } else {
            this.logger.log(`Migration already applied: ${name}`);
          }
        } catch (error) {
          this.logger.error(
            `Failed to apply migration ${name}: ${error.message}`,
          );
          throw error;
        }
      }

      this.logger.log('All migrations completed successfully');
    } catch (error) {
      this.logger.error(`Migration failed: ${error.message}`);
      throw error;
    }
  }
}
