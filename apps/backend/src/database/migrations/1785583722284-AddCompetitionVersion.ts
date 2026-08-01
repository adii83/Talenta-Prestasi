import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompetitionVersion1785583722284 implements MigrationInterface {
  name = 'AddCompetitionVersion1785583722284';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "competitions" ADD "version" integer NOT NULL DEFAULT '1'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "competitions" DROP COLUMN "version"`);
  }
}
