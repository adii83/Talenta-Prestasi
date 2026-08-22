import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixEventDetailDecreeForeignKey1787529600000
  implements MigrationInterface
{
  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE event_detail_settings
      DROP CONSTRAINT IF EXISTS event_detail_settings_decree_document_id_event_site_id_fkey
    `);
    await runner.query(`
      ALTER TABLE event_detail_settings
      ADD CONSTRAINT event_detail_settings_decree_document_id_fkey
      FOREIGN KEY (decree_document_id) REFERENCES event_documents(id) ON DELETE SET NULL
    `);
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE event_detail_settings
      DROP CONSTRAINT IF EXISTS event_detail_settings_decree_document_id_fkey
    `);
    await runner.query(`
      ALTER TABLE event_detail_settings
      ADD CONSTRAINT event_detail_settings_decree_document_id_event_site_id_fkey
      FOREIGN KEY (decree_document_id, event_site_id)
      REFERENCES event_documents(id, event_site_id) ON DELETE SET NULL
    `);
  }
}
