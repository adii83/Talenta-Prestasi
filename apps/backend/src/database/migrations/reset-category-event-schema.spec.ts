import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AddEventDraftPublications1786586400000 } from './1786586400000-AddEventDraftPublications';
import { AddEventPeriodIdentity1786672800000 } from './1786672800000-AddEventPeriodIdentity';
import { AddEventLogoSettings1786759200000 } from './1786759200000-AddEventLogoSettings';
import { AddWinnerDisplayMode1786845600000 } from './1786845600000-AddWinnerDisplayMode';
import { ResetCategoryEventSchema1786500000000 } from './1786500000000-ResetCategoryEventSchema';

describe('ResetCategoryEventSchema migration', () => {
  it('does not drop the public schema that contains the TypeORM migration ledger', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn((sql: string) => {
        queries.push(sql.trim());
        return Promise.resolve();
      }),
    };

    await new ResetCategoryEventSchema1786500000000().up(runner as never);

    expect(queries).not.toContain('DROP SCHEMA public CASCADE');
  });

  it('keeps the TypeORM migration ledger available during rollback', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn((sql: string) => {
        queries.push(sql.trim());
        return Promise.resolve();
      }),
    };

    await new ResetCategoryEventSchema1786500000000().down(runner as never);

    expect(queries).not.toContain('DROP SCHEMA public CASCADE');
  });

  it('adds Event publication snapshots without resetting existing content', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn((sql: string) => {
        queries.push(sql.trim());
        return Promise.resolve();
      }),
    };

    await new AddEventDraftPublications1786586400000().up(runner as never);

    const source = queries.join('\n');
    expect(source).toContain('CREATE TABLE event_publications');
    expect(source).toContain('public_snapshot jsonb');
    expect(source).toContain('workspace_snapshot jsonb');
    expect(source).toContain('CREATE TABLE event_publication_assets');
    expect(source).not.toContain('DROP TABLE competition_categories');
  });

  it('adds structured Event period identity without resetting Event content', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn((sql: string) => {
        queries.push(sql.trim());
        return Promise.resolve();
      }),
    };

    await new AddEventPeriodIdentity1786672800000().up(runner as never);

    const source = queries.join('\n');
    expect(source).toContain('ADD COLUMN period_year int');
    expect(source).toContain('ADD COLUMN batch_number int');
    expect(source).toContain('ADD COLUMN batch_label varchar(40)');
    expect(source).toContain('ADD COLUMN batch_note varchar(240)');
    expect(source).toContain('ADD COLUMN activated_at timestamptz');
    expect(source).toContain(
      'CHECK (period_year IS NULL OR (period_year BETWEEN 2000 AND 2100))',
    );
    expect(source).toContain('uq_event_period_unbatched');
    expect(source).toContain('uq_event_period_batch');
    expect(source).not.toContain('DROP TABLE event_sites');
  });

  it('adds Event-scoped logo and bounded navbar size without deleting legacy assets', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn((sql: string) => {
        queries.push(sql.trim());
        return Promise.resolve();
      }),
    };

    await new AddEventLogoSettings1786759200000().up(runner as never);

    const source = queries.join('\n');
    expect(source).toContain('ADD COLUMN logo_asset_id uuid');
    expect(source).toContain('ADD COLUMN navbar_logo_size smallint');
    expect(source).toContain('BETWEEN 24 AND 44');
    expect(source).toContain('event.mascot_asset_id');
    expect(source).toContain('category.logo_asset_id');
    expect(source).not.toContain('DROP COLUMN mascot_asset_id');
    expect(source).not.toContain('DROP COLUMN logo_asset_id');
  });

  it('adds a nullable archive display name without resetting Event content', () => {
    const path = join(
      __dirname,
      '1786759300000-AddArchiveDisplayName.ts',
    );
    expect(existsSync(path)).toBe(true);
    const source = readFileSync(path, 'utf8');

    expect(source).toContain('ALTER TABLE event_detail_settings');
    expect(source).toContain('ADD COLUMN archive_display_name varchar(200)');
    expect(source).not.toContain('NOT NULL');
    expect(source).not.toContain('DROP TABLE event_detail_settings');
    expect(source).not.toContain('DROP SCHEMA');
  });

  it('declares nullable Winner metadata with explicit varchar types', () => {
    const source = readFileSync(
      join(__dirname, '../../entities/winner.entity.ts'),
      'utf8',
    );

    expect(source).toContain(
      "@Column({ name: 'full_name', type: 'varchar', nullable: true })",
    );
    for (const field of ['school', 'district', 'regency', 'province'])
      expect(source).toContain(
        `@Column({ type: 'varchar', default: '', nullable: true })\n  ${field}!: string | null;`,
      );
    expect(source).toMatch(
      /@Column\(\{[\s\S]*?name: 'exam_number',[\s\S]*?type: 'varchar',[\s\S]*?nullable: true,[\s\S]*?\}\)\s+examNumber!: string \| null;/,
    );
  });

  it('adds winner display modes and restores legacy rows safely on rollback', async () => {
    const upQueries: string[] = [];
    const downQueries: string[] = [];

    await new AddWinnerDisplayMode1786845600000().up({
      query: jest.fn((sql: string) => {
        upQueries.push(sql.trim());
        return Promise.resolve();
      }),
    } as never);
    await new AddWinnerDisplayMode1786845600000().down({
      query: jest.fn((sql: string) => {
        downQueries.push(sql.trim());
        return Promise.resolve();
      }),
    } as never);

    const up = upQueries.join('\n');
    const down = downQueries.join('\n');

    expect(up).toContain(
      "ADD COLUMN display_mode varchar(16) NOT NULL DEFAULT 'built_in'",
    );
    expect(up).toContain('ADD COLUMN design_asset_id uuid');
    expect(up).toContain("display_mode IN ('built_in', 'custom')");
    expect(up).toContain('ALTER COLUMN full_name DROP NOT NULL');
    expect(up).toContain('CONSTRAINT chk_winner_mode_consistency');
    expect(up).toContain('CREATE INDEX idx_winners_design_asset');
    expect(up).not.toContain('DROP TABLE winners');
    expect(up).not.toContain('DROP SCHEMA');

    expect(down).toContain(
      "full_name = COALESCE(NULLIF(rank_label, ''), 'Pemenang')",
    );
    expect(down).toContain("school = COALESCE(school, '')");
    expect(down.indexOf('UPDATE winners')).toBeLessThan(
      down.indexOf('ALTER COLUMN full_name SET NOT NULL'),
    );
    expect(down).not.toContain('ALTER COLUMN full_name SET DEFAULT');
  });
});
