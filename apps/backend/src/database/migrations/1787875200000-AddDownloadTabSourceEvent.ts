import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDownloadTabSourceEvent1787875200000
  implements MigrationInterface
{
  name = 'AddDownloadTabSourceEvent1787875200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE download_tabs ADD COLUMN source_event_site_id uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE download_tabs ADD CONSTRAINT fk_download_tab_source_event FOREIGN KEY (source_event_site_id) REFERENCES event_sites(id) ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE download_tabs DROP CONSTRAINT fk_download_tab_source_event`,
    );
    await queryRunner.query(
      `ALTER TABLE download_tabs DROP COLUMN source_event_site_id`,
    );
  }
}
