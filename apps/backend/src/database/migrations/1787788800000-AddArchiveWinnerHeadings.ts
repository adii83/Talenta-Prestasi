import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArchiveWinnerHeadings1787788800000
  implements MigrationInterface
{
  name = 'AddArchiveWinnerHeadings1787788800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE event_detail_settings
        ADD COLUMN winners_eyebrow varchar(120) NOT NULL DEFAULT 'Hasil Ajang Talenta',
        ADD COLUMN winners_title varchar(200) NOT NULL DEFAULT 'Daftar Pemenang'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE event_detail_settings
        DROP COLUMN winners_title,
        DROP COLUMN winners_eyebrow`,
    );
  }
}
