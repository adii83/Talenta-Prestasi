import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowInheritedDownloadSources1785830300000
  implements MigrationInterface
{
  name = 'AllowInheritedDownloadSources1785830300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "download_competitions" DROP CONSTRAINT "FK_d036ee5591ef0fa756d250c767b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "download_competitions" ADD CONSTRAINT "FK_download_competition_source" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "download_competitions" DROP CONSTRAINT "FK_download_competition_source"`,
    );
    await queryRunner.query(
      `DELETE FROM "download_competitions" target USING "competitions" competition WHERE target."competition_id"=competition."id" AND target."event_site_id"<>competition."event_site_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "download_competitions" ADD CONSTRAINT "FK_d036ee5591ef0fa756d250c767b" FOREIGN KEY ("competition_id", "event_site_id") REFERENCES "competitions"("id","event_site_id") ON DELETE CASCADE`,
    );
  }
}
