import { MigrationInterface, QueryRunner } from "typeorm";

export class EnableLtreeExtension1742827301075 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS ltree;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP EXTENSION IF EXISTS ltree;`);
    }

}
