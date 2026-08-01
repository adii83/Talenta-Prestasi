import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPageSettings1785581336621 implements MigrationInterface {
  name = 'AddPageSettings1785581336621';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "page_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_site_id" uuid NOT NULL, "page_type" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "eyebrow" character varying NOT NULL DEFAULT '', "title" character varying NOT NULL DEFAULT '', "description" text NOT NULL DEFAULT '', "alignment" character varying NOT NULL DEFAULT 'center', CONSTRAINT "uq_page_settings_per_site" UNIQUE ("event_site_id", "page_type"), CONSTRAINT "PK_fbb1ad2f481b3b8e438e5ba2bab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "winner_page_settings" ("event_site_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "show_decree" boolean NOT NULL DEFAULT true, "metadata_visibility" jsonb NOT NULL DEFAULT '{}', "archive_active" boolean NOT NULL DEFAULT true, "archive_limit" integer NOT NULL DEFAULT '3', CONSTRAINT "PK_06a2431d3e8fe75cf4662701d78" PRIMARY KEY ("event_site_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_settings" ADD CONSTRAINT "FK_3bdfe541e60a41c9f4ef3abf5b8" FOREIGN KEY ("event_site_id") REFERENCES "event_sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "winner_page_settings" ADD CONSTRAINT "FK_06a2431d3e8fe75cf4662701d78" FOREIGN KEY ("event_site_id") REFERENCES "event_sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "winner_page_settings" DROP CONSTRAINT "FK_06a2431d3e8fe75cf4662701d78"`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_settings" DROP CONSTRAINT "FK_3bdfe541e60a41c9f4ef3abf5b8"`,
    );
    await queryRunner.query(`DROP TABLE "winner_page_settings"`);
    await queryRunner.query(`DROP TABLE "page_settings"`);
  }
}
