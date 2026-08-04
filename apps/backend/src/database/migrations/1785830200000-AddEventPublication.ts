import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventPublication1785830200000 implements MigrationInterface {
  name = 'AddEventPublication1785830200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_sites" ADD "publication_status" character varying NOT NULL DEFAULT 'draft'`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_sites" ADD "published_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_sites" ADD CONSTRAINT "CHK_event_publication_status" CHECK ("publication_status" IN ('draft','published','unpublished'))`,
    );
    await queryRunner.query(
      `UPDATE "event_sites" SET "publication_status"='published',"published_at"=now() WHERE "status"='active' AND "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_sites" DROP CONSTRAINT "CHK_event_publication_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_sites" DROP COLUMN "published_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_sites" DROP COLUMN "publication_status"`,
    );
  }
}
