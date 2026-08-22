import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWinnerDecreeLabels1787356800000
  implements MigrationInterface
{
  name = 'AddWinnerDecreeLabels1787356800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE event_documents ADD COLUMN default_download_label varchar(40) NOT NULL DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE event_documents DROP COLUMN default_download_label`,
    );
  }
}
