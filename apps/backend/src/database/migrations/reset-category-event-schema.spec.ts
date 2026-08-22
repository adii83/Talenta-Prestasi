import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AddEventDraftPublications1786586400000 } from './1786586400000-AddEventDraftPublications';
import { AddEventPeriodIdentity1786672800000 } from './1786672800000-AddEventPeriodIdentity';
import { AddEventLogoSettings1786759200000 } from './1786759200000-AddEventLogoSettings';
import { AddWinnerDisplayMode1786845600000 } from './1786845600000-AddWinnerDisplayMode';
import { AddWorkspaceRevision1787270400000 } from './1787270400000-AddWorkspaceRevision';
import { AddWinnerDecreeLabels1787356800000 } from './1787356800000-AddWinnerDecreeLabels';
import { AddWinnerDecreeBannerTitle1787443200000 } from './1787443200000-AddWinnerDecreeBannerTitle';
import { FixEventDetailDecreeForeignKeyColumns1787616000000 } from './1787616000000-FixEventDetailDecreeForeignKeyColumns';
import { ResetCategoryEventSchema1786500000000 } from './1786500000000-ResetCategoryEventSchema';
import { ReplaceUserEmailWithUsername1787961600000 } from './1787961600000-ReplaceUserEmailWithUsername';

describe('ResetCategoryEventSchema migration', () => {
  it('creates username-only users in the reset schema', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn((sql: string) => {
        queries.push(sql.trim());
        return Promise.resolve();
      }),
    };

    await new ResetCategoryEventSchema1786500000000().up(runner as never);

    const source = queries.join('\n');
    expect(source).toContain('username varchar(64) NOT NULL');
    expect(source).toContain('CONSTRAINT chk_users_username');
    expect(source).toContain("username ~ '^[a-z0-9._-]{3,64}$'");
    expect(source).toContain('CREATE UNIQUE INDEX uq_users_username');
    expect(source).not.toContain('uq_users_email');
  });

  it('replaces user email with normalized unique username without recreating users', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn((sql: string) => {
        queries.push(sql.trim());
        return Promise.resolve();
      }),
    };

    await new ReplaceUserEmailWithUsername1787961600000().up(
      runner as never,
    );

    const source = queries.join('\n');
    expect(source).toContain("column_name = 'email'");
    expect(source).toContain(
      'ALTER TABLE "users" RENAME COLUMN "email" TO "username"',
    );
    expect(source).toContain('DROP INDEX IF EXISTS "uq_users_username"');
    expect(source).toContain(
      'ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_username"',
    );
    expect(source).toContain(
      "split_part(lower(trim(user_row.username)), '@', 1)",
    );
    expect(source).toContain('SELECT id, username FROM users ORDER BY id');
    expect(source).toContain("candidate := left(base_username, 64 - length(suffix::text) - 1)");
    expect(source).toContain('chk_users_username');
    expect(source).toContain("username ~ '^[a-z0-9._-]{3,64}$'");
    expect(source).toContain('CREATE UNIQUE INDEX "uq_users_username"');
    expect(source).not.toContain('DROP TABLE "users"');
  });

  it('rolls username back to a unique local email', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn((sql: string) => {
        queries.push(sql.trim());
        return Promise.resolve();
      }),
    };

    await new ReplaceUserEmailWithUsername1787961600000().down(
      runner as never,
    );

    const source = queries.join('\n');
    expect(source).toContain("username || '@legacy.local'");
    expect(source).toContain(
      'ALTER TABLE "users" RENAME COLUMN "username" TO "email"',
    );
    expect(source).toContain('CREATE UNIQUE INDEX');
  });

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
    const path = join(__dirname, '1786759300000-AddArchiveDisplayName.ts');
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

  it('adds and removes workspace revision', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn((sql: string) => {
        queries.push(sql.trim());
        return Promise.resolve();
      }),
    };
    const migration = new AddWorkspaceRevision1787270400000();

    await migration.up(runner as never);
    await migration.down(runner as never);

    expect(queries[0]).toContain(
      'ADD "workspace_revision" integer NOT NULL DEFAULT 1',
    );
    expect(queries[1]).toContain('DROP COLUMN "workspace_revision"');
  });

  it('adds an independent winner decree Banner title', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn((sql: string) => {
        queries.push(sql.trim());
        return Promise.resolve();
      }),
    };
    const migration = new AddWinnerDecreeBannerTitle1787443200000();

    await migration.up(runner as never);
    await migration.down(runner as never);

    expect(queries[0]).toContain(
      "ADD COLUMN decree_title varchar(200) NOT NULL DEFAULT 'SK Penetapan Pemenang'",
    );
    expect(queries[1]).toContain('DROP COLUMN decree_title');
  });

  it('keeps the applied description migration immutable and adds headings separately', () => {
    const descriptionPath = join(
      __dirname,
      '1787702400000-AddArchiveWinnerDescription.ts',
    );
    const headingsPath = join(
      __dirname,
      '1787788800000-AddArchiveWinnerHeadings.ts',
    );
    expect(existsSync(descriptionPath)).toBe(true);
    expect(existsSync(headingsPath)).toBe(true);
    const description = readFileSync(descriptionPath, 'utf8');
    const headings = readFileSync(headingsPath, 'utf8');

    expect(description).toContain(
      "ADD COLUMN winners_description text NOT NULL DEFAULT ''",
    );
    expect(description).not.toContain('winners_eyebrow');
    expect(description).not.toContain('winners_title');
    expect(headings).toContain(
      "ADD COLUMN winners_eyebrow varchar(120) NOT NULL DEFAULT 'Hasil Ajang Talenta'",
    );
    expect(headings).toContain(
      "ADD COLUMN winners_title varchar(200) NOT NULL DEFAULT 'Daftar Pemenang'",
    );
    expect(headings).not.toContain('DROP TABLE event_detail_settings');
    expect(headings).not.toContain('DROP SCHEMA');
  });

  it('adds a stable source Event identity to Download tabs', () => {
    const path = join(
      __dirname,
      '1787875200000-AddDownloadTabSourceEvent.ts',
    );
    expect(existsSync(path)).toBe(true);
    const source = readFileSync(path, 'utf8');

    expect(source).toContain('ADD COLUMN source_event_site_id uuid');
    expect(source).not.toContain('SET source_event_site_id=event_site_id');
    expect(source).not.toContain('ALTER COLUMN source_event_site_id SET NOT NULL');
    expect(source).toContain('REFERENCES event_sites(id) ON DELETE CASCADE');
    expect(source).not.toContain('DROP TABLE download_tabs');
    expect(source).not.toContain('DROP SCHEMA');
  });

  it('uses a nullable single-column legacy decree foreign key', async () => {
    const upQueries: string[] = [];
    const downQueries: string[] = [];
    const migration = new FixEventDetailDecreeForeignKeyColumns1787616000000();

    await migration.up({
      query: jest.fn((sql: string) => {
        upQueries.push(sql.trim());
        return Promise.resolve();
      }),
    } as never);
    await migration.down({
      query: jest.fn((sql: string) => {
        downQueries.push(sql.trim());
        return Promise.resolve();
      }),
    } as never);

    const up = upQueries.join('\n');
    expect(up).toContain(
      'FOREIGN KEY (decree_document_id, event_site_id)',
    );
    expect(up).toContain('REFERENCES event_documents(id, event_site_id)');
    expect(up).toContain('ON DELETE SET NULL (decree_document_id)');
    expect(downQueries.join('\n')).toContain('ON DELETE SET NULL');
    expect(downQueries.join('\n')).not.toContain(
      'ON DELETE SET NULL (decree_document_id)',
    );
  });

  it('adds a bounded default download label for multiple winner decrees', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn((sql: string) => {
        queries.push(sql.trim());
        return Promise.resolve();
      }),
    };
    const migration = new AddWinnerDecreeLabels1787356800000();

    await migration.up(runner as never);
    await migration.down(runner as never);

    expect(queries[0]).toContain(
      "ADD COLUMN default_download_label varchar(40) NOT NULL DEFAULT ''",
    );
    expect(queries[0]).not.toContain('DROP TABLE event_documents');
    expect(queries[1]).toContain('DROP COLUMN default_download_label');
  });
});
