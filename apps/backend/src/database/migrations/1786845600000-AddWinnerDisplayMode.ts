import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWinnerDisplayMode1786845600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE winners
        ADD COLUMN display_mode varchar(16) NOT NULL DEFAULT 'built_in',
        ADD COLUMN design_asset_id uuid REFERENCES media_assets(id),
        ADD CONSTRAINT chk_winner_display_mode
          CHECK (display_mode IN ('built_in', 'custom'))
    `);

    await queryRunner.query(`
      ALTER TABLE winners
        ALTER COLUMN full_name DROP NOT NULL,
        ALTER COLUMN school DROP NOT NULL,
        ALTER COLUMN exam_number DROP NOT NULL,
        ALTER COLUMN district DROP NOT NULL,
        ALTER COLUMN regency DROP NOT NULL,
        ALTER COLUMN province DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE winners
        ADD CONSTRAINT chk_winner_mode_consistency CHECK (
          CASE
            WHEN display_mode = 'built_in'
              THEN full_name IS NOT NULL AND design_asset_id IS NULL
            WHEN display_mode = 'custom'
              THEN full_name IS NULL
                AND school IS NULL
                AND exam_number IS NULL
                AND district IS NULL
                AND regency IS NULL
                AND province IS NULL
                AND photo_asset_id IS NULL
                AND design_asset_id IS NOT NULL
            ELSE false
          END
        )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_winners_design_asset ON winners(design_asset_id)
        WHERE design_asset_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE winners
        DROP CONSTRAINT IF EXISTS chk_winner_mode_consistency,
        DROP CONSTRAINT IF EXISTS chk_winner_display_mode
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_winners_design_asset`);

    await queryRunner.query(`
      UPDATE winners
      SET full_name = COALESCE(NULLIF(rank_label, ''), 'Pemenang'),
          school = COALESCE(school, ''),
          exam_number = COALESCE(exam_number, ''),
          district = COALESCE(district, ''),
          regency = COALESCE(regency, ''),
          province = COALESCE(province, '')
      WHERE full_name IS NULL
         OR school IS NULL
         OR exam_number IS NULL
         OR district IS NULL
         OR regency IS NULL
         OR province IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE winners
        ALTER COLUMN full_name SET NOT NULL,
        ALTER COLUMN school SET NOT NULL,
        ALTER COLUMN exam_number SET NOT NULL,
        ALTER COLUMN district SET NOT NULL,
        ALTER COLUMN regency SET NOT NULL,
        ALTER COLUMN province SET NOT NULL,
        DROP COLUMN IF EXISTS design_asset_id,
        DROP COLUMN IF EXISTS display_mode
    `);
  }
}
