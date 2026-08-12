import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowCrossEventDownloadDocuments1786672900000
  implements MigrationInterface
{
  name = 'AllowCrossEventDownloadDocuments1786672900000';

  public async up(runner: QueryRunner): Promise<void> {
    // Drop constraint FK lama yang membatasi document_id ke event_site_id yang sama
    await runner.query(`
      ALTER TABLE download_document_settings
        DROP CONSTRAINT IF EXISTS download_document_settings_document_id_event_site_id_fkey
    `);

    // Tambahkan constraint FK baru yang mengizinkan document_id dari mana saja di event_documents(id)
    await runner.query(`
      ALTER TABLE download_document_settings
        ADD CONSTRAINT download_document_settings_document_id_fkey
        FOREIGN KEY (document_id) REFERENCES event_documents(id) ON DELETE CASCADE
    `);
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE download_document_settings
        DROP CONSTRAINT IF EXISTS download_document_settings_document_id_fkey
    `);
    await runner.query(`
      ALTER TABLE download_document_settings
        ADD CONSTRAINT download_document_settings_document_id_event_site_id_fkey
        FOREIGN KEY (document_id, event_site_id) REFERENCES event_documents(id, event_site_id) ON DELETE CASCADE
    `);
  }
}
