import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventArchiveInheritance1785830000000 implements MigrationInterface {
  name = 'AddEventArchiveInheritance1785830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "event_site_archive_sources" (
        "event_site_id" uuid NOT NULL,
        "source_event_site_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_site_archive_sources" PRIMARY KEY ("event_site_id", "source_event_site_id"),
        CONSTRAINT "CHK_event_archive_source_not_self" CHECK ("event_site_id" <> "source_event_site_id"),
        CONSTRAINT "FK_event_archive_target" FOREIGN KEY ("event_site_id") REFERENCES "event_sites"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_event_archive_source" FOREIGN KEY ("source_event_site_id") REFERENCES "event_sites"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_event_archive_source" ON "event_site_archive_sources" ("source_event_site_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_event_archive_source"`);
    await queryRunner.query(`DROP TABLE "event_site_archive_sources"`);
  }
}
