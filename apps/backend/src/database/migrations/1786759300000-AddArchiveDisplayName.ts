import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArchiveDisplayName1786759300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE event_detail_settings
        ADD COLUMN archive_display_name varchar(200)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE event_detail_settings
        DROP COLUMN IF EXISTS archive_display_name
    `);
  }
}
