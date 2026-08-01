import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDownloads1785582029157 implements MigrationInterface {
  name = 'AddDownloads1785582029157';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "download_document_settings" ("download_competition_id" uuid NOT NULL, "document_id" uuid NOT NULL, "competition_id" uuid NOT NULL, "is_visible" boolean NOT NULL DEFAULT true, "label_override" character varying NOT NULL DEFAULT '', "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_918eb9a19404d194a0fccd9f91c" PRIMARY KEY ("download_competition_id", "document_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "download_competitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_site_id" uuid NOT NULL, "competition_id" uuid NOT NULL, "custom_tab_name" character varying NOT NULL DEFAULT '', "is_default" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "uq_download_competition_owner" UNIQUE ("id", "competition_id"), CONSTRAINT "uq_download_competition_per_site" UNIQUE ("event_site_id", "competition_id"), CONSTRAINT "PK_5c4e2c20cecb8e31be0a8f4838a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_default_download_per_site" ON "download_competitions"  ("event_site_id") WHERE "is_default" = true`,
    );
    await queryRunner.query(
      `ALTER TABLE "competitions" ADD CONSTRAINT "uq_competition_owner" UNIQUE ("id", "event_site_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "download_document_settings" ADD CONSTRAINT "FK_6851a456fae0b46e3b118d9e212" FOREIGN KEY ("download_competition_id", "competition_id") REFERENCES "download_competitions"("id","competition_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "download_document_settings" ADD CONSTRAINT "FK_5a5c19508f498ed11445e36e997" FOREIGN KEY ("document_id", "competition_id") REFERENCES "competition_documents"("id","competition_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "download_competitions" ADD CONSTRAINT "FK_745e490b6e2506f883d17d62b5c" FOREIGN KEY ("event_site_id") REFERENCES "event_sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "download_competitions" ADD CONSTRAINT "FK_d036ee5591ef0fa756d250c767b" FOREIGN KEY ("competition_id", "event_site_id") REFERENCES "competitions"("id","event_site_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "download_competitions" DROP CONSTRAINT "FK_d036ee5591ef0fa756d250c767b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "download_competitions" DROP CONSTRAINT "FK_745e490b6e2506f883d17d62b5c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "download_document_settings" DROP CONSTRAINT "FK_5a5c19508f498ed11445e36e997"`,
    );
    await queryRunner.query(
      `ALTER TABLE "download_document_settings" DROP CONSTRAINT "FK_6851a456fae0b46e3b118d9e212"`,
    );
    await queryRunner.query(
      `ALTER TABLE "competitions" DROP CONSTRAINT "uq_competition_owner"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."uq_default_download_per_site"`,
    );
    await queryRunner.query(`DROP TABLE "download_competitions"`);
    await queryRunner.query(`DROP TABLE "download_document_settings"`);
  }
}
