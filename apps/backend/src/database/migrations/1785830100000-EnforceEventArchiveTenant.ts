import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceEventArchiveTenant1785830100000 implements MigrationInterface {
  name = 'EnforceEventArchiveTenant1785830100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_site_archive_sources" ADD "organization_id" uuid`,
    );
    await queryRunner.query(
      `UPDATE "event_site_archive_sources" source SET "organization_id"=site."organization_id" FROM "event_sites" site WHERE site."id"=source."event_site_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_site_archive_sources" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_event_site_owner" ON "event_sites" ("id", "organization_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_site_archive_sources" DROP CONSTRAINT "FK_event_archive_target"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_site_archive_sources" DROP CONSTRAINT "FK_event_archive_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_site_archive_sources" ADD CONSTRAINT "FK_event_archive_target_owner" FOREIGN KEY ("event_site_id", "organization_id") REFERENCES "event_sites"("id", "organization_id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_site_archive_sources" ADD CONSTRAINT "FK_event_archive_source_owner" FOREIGN KEY ("source_event_site_id", "organization_id") REFERENCES "event_sites"("id", "organization_id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_site_archive_sources" DROP CONSTRAINT "FK_event_archive_source_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_site_archive_sources" DROP CONSTRAINT "FK_event_archive_target_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_site_archive_sources" ADD CONSTRAINT "FK_event_archive_source" FOREIGN KEY ("source_event_site_id") REFERENCES "event_sites"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_site_archive_sources" ADD CONSTRAINT "FK_event_archive_target" FOREIGN KEY ("event_site_id") REFERENCES "event_sites"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`DROP INDEX "uq_event_site_owner"`);
    await queryRunner.query(
      `ALTER TABLE "event_site_archive_sources" DROP COLUMN "organization_id"`,
    );
  }
}
