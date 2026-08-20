import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceRevision1787270400000 implements MigrationInterface {
  name = 'AddWorkspaceRevision1787270400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_sites" ADD "workspace_revision" integer NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_sites" DROP COLUMN "workspace_revision"`,
    );
  }
}
