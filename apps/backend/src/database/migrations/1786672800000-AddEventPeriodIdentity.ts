import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventPeriodIdentity1786672800000
  implements MigrationInterface
{
  name = 'AddEventPeriodIdentity1786672800000';

  public async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE event_sites
        ADD COLUMN period_year int,
        ADD COLUMN batch_number int,
        ADD COLUMN batch_label varchar(40),
        ADD COLUMN batch_note varchar(240) NOT NULL DEFAULT '',
        ADD COLUMN activated_at timestamptz`);
    await runner.query(`
      UPDATE event_sites event
      SET activated_at=event.created_at
      WHERE event.is_active=true
         OR EXISTS (
           SELECT 1 FROM event_publications publication
           WHERE publication.event_site_id=event.id
         )`);
    await runner.query(`
      WITH candidates AS (
        SELECT event.id,(substring(event.slug FROM '^([0-9]{4})'))::int AS year,
               count(*) OVER (
                 PARTITION BY event.category_id,substring(event.slug FROM '^([0-9]{4})')
               ) AS candidate_count
        FROM event_sites event
        WHERE event.slug ~ '^[0-9]{4}(-.*)?$'
      )
      UPDATE event_sites event
      SET period_year=candidate.year
      FROM candidates candidate
      WHERE candidate.id=event.id AND candidate.candidate_count=1
        AND candidate.year BETWEEN 2000 AND 2100`);
    await runner.query(`
      ALTER TABLE event_sites
        ADD CONSTRAINT chk_event_period_year
          CHECK (period_year IS NULL OR (period_year BETWEEN 2000 AND 2100)),
        ADD CONSTRAINT chk_event_batch_number
          CHECK (batch_number IS NULL OR batch_number > 0),
        ADD CONSTRAINT chk_event_batch_identity
          CHECK ((batch_number IS NULL AND batch_label IS NULL) OR
                 (batch_number IS NOT NULL AND length(trim(batch_label)) > 0))`);
    await runner.query(`
      CREATE UNIQUE INDEX uq_event_period_unbatched
      ON event_sites(category_id,period_year)
      WHERE period_year IS NOT NULL AND batch_number IS NULL AND deleted_at IS NULL`);
    await runner.query(`
      CREATE UNIQUE INDEX uq_event_period_batch
      ON event_sites(category_id,period_year,batch_number)
      WHERE period_year IS NOT NULL AND batch_number IS NOT NULL`);
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP INDEX IF EXISTS uq_event_period_batch`);
    await runner.query(`DROP INDEX IF EXISTS uq_event_period_unbatched`);
    await runner.query(`
      ALTER TABLE event_sites
        DROP CONSTRAINT IF EXISTS chk_event_batch_identity,
        DROP CONSTRAINT IF EXISTS chk_event_batch_number,
        DROP CONSTRAINT IF EXISTS chk_event_period_year,
        DROP COLUMN IF EXISTS activated_at,
        DROP COLUMN IF EXISTS batch_note,
        DROP COLUMN IF EXISTS batch_label,
        DROP COLUMN IF EXISTS batch_number,
        DROP COLUMN IF EXISTS period_year`);
  }
}
