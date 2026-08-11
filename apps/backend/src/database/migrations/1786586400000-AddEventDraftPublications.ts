import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventDraftPublications1786586400000
  implements MigrationInterface
{
  name = 'AddEventDraftPublications1786586400000';

  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE event_publications (
        event_site_id uuid PRIMARY KEY REFERENCES event_sites(id) ON DELETE CASCADE,
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        category_id uuid NOT NULL REFERENCES competition_categories(id) ON DELETE CASCADE,
        version int NOT NULL DEFAULT 1,
        schema_version int NOT NULL DEFAULT 1,
        public_snapshot jsonb NOT NULL,
        workspace_snapshot jsonb NOT NULL,
        workspace_checksum varchar(64) NOT NULL,
        published_at timestamptz NOT NULL DEFAULT now(),
        published_by uuid REFERENCES users(id) ON DELETE SET NULL
      )`);
    await runner.query(`
      CREATE INDEX idx_event_publications_category
      ON event_publications(category_id, published_at DESC)`);
    await runner.query(`
      CREATE TABLE event_publication_assets (
        event_site_id uuid NOT NULL REFERENCES event_publications(event_site_id) ON DELETE CASCADE,
        asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
        PRIMARY KEY(event_site_id, asset_id)
      )`);
    await runner.query(`
      CREATE INDEX idx_event_publication_assets_asset
      ON event_publication_assets(asset_id)`);
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS event_publication_assets`);
    await runner.query(`DROP TABLE IF EXISTS event_publications`);
  }
}
