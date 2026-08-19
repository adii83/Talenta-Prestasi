import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventLogoSettings1786759200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE event_sites
        ADD COLUMN logo_asset_id uuid REFERENCES media_assets(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      UPDATE event_sites event
      SET logo_asset_id=COALESCE(event.mascot_asset_id,category.logo_asset_id)
      FROM competition_categories category
      WHERE category.id=event.category_id AND event.logo_asset_id IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE site_settings
        ADD COLUMN navbar_logo_size smallint NOT NULL DEFAULT 36,
        ADD CONSTRAINT chk_site_settings_navbar_logo_size
          CHECK (navbar_logo_size BETWEEN 24 AND 44)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE site_settings
        DROP CONSTRAINT IF EXISTS chk_site_settings_navbar_logo_size,
        DROP COLUMN IF EXISTS navbar_logo_size
    `);
    await queryRunner.query(`
      ALTER TABLE event_sites
        DROP COLUMN IF EXISTS logo_asset_id
    `);
  }
}
