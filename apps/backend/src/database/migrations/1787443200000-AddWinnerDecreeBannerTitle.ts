import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWinnerDecreeBannerTitle1787443200000
  implements MigrationInterface
{
  name = 'AddWinnerDecreeBannerTitle1787443200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE winner_page_settings ADD COLUMN decree_title varchar(200) NOT NULL DEFAULT 'SK Penetapan Pemenang'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE winner_page_settings DROP COLUMN decree_title`,
    );
  }
}
