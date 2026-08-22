import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArchiveWinnerDescription1787702400000
  implements MigrationInterface
{
  name = 'AddArchiveWinnerDescription1787702400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE event_detail_settings ADD COLUMN winners_description text NOT NULL DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE event_detail_settings DROP COLUMN winners_description`,
    );
  }
}
