import { PublicContentService } from './public-content.service';
import { WorkspaceSnapshotService } from './workspace-snapshot.service';

describe('PublicContentService', () => {
  it('does not overlap queries on a shared transaction executor', async () => {
    let active = false;
    const db = {
      query: jest.fn(async (sql: string) => {
        if (active) throw new Error('query overlap');
        active = true;
        await new Promise((resolve) => setImmediate(resolve));
        active = false;
        if (sql.includes('FROM event_sites event'))
          return [
            {
              eventId: 'event-1',
              categoryId: 'category-1',
              categoryName: 'Octal',
              categorySlug: 'octal',
              eventName: 'Octal',
              eventSlug: '2027',
              periodYear: 2027,
              batchNumber: null,
              batchLabel: null,
              organizerName: 'Talenta',
              logoAssetId: null,
              navbarLogoSize: 36,
              primaryColor: '#123456',
              navigation: {},
              contact: {},
              footer: {},
              seo: {},
              description: '',
              mascotAssetId: null,
              fallbackIcon: 'star',
            },
          ];
        return [];
      }),
    };

    await expect(
      new PublicContentService(db as never).build('event-1', db as never),
    ).resolves.toMatchObject({ schemaVersion: 1 });
  });

  it('builds a complete snapshot for exactly one Event', async () => {
    const db = {
      query: jest.fn((sql: string) => {
        if (
          sql.includes('FROM event_sites event') &&
          sql.includes('event.id=$1')
        )
          return Promise.resolve([
            {
              eventId: 'event-1',
              categoryId: 'category-1',
              categoryName: 'Octal',
              categorySlug: 'octal',
              eventName: 'Octal',
              eventSlug: '2027-gelombang-2',
              periodYear: 2027,
              batchNumber: 2,
              batchLabel: 'Gelombang',
              organizerName: 'Talenta',
              logoAssetId: '11111111-1111-4111-8111-111111111111',
              navbarLogoSize: 42,
              primaryColor: '#123456',
              navigation: {},
              contact: {},
              footer: {},
              seo: {},
              description: 'Periode baru',
              mascotAssetId: null,
              fallbackIcon: 'star',
            },
          ]);
        if (sql.includes('FROM home_sections'))
          return Promise.resolve([
            { id: 'home-1', type: 'hero', sortOrder: 0, settings: {} },
          ]);
        if (sql.includes('FROM download_tabs')) return Promise.resolve([]);
        if (sql.includes("page_type='download'")) return Promise.resolve([]);
        if (sql.includes('FROM faq_categories')) return Promise.resolve([]);
        if (sql.includes("page_type='faq'")) return Promise.resolve([]);
        if (sql.includes('FROM winner_categories')) return Promise.resolve([]);
        if (sql.includes("page_type='winners'")) return Promise.resolve([]);
        if (sql.includes('FROM winner_page_settings'))
          return Promise.resolve([]);
        if (sql.includes('FROM event_detail_settings'))
          return Promise.resolve([]);
        if (sql.includes("page_type='archive'")) return Promise.resolve([]);
        if (sql.includes('FROM event_documents')) return Promise.resolve([]);
        throw new Error(`Unexpected query: ${sql}`);
      }),
    };

    const snapshot = await new PublicContentService(db as never).build(
      'event-1',
    );

    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.bootstrap.site).toMatchObject({
      logoAssetId: '11111111-1111-4111-8111-111111111111',
      logoUrl: '/api/v1/public/media/11111111-1111-4111-8111-111111111111',
    });
    expect(snapshot.bootstrap.settings).toMatchObject({ navbarLogoSize: 42 });
    expect(db.query.mock.calls[0][0]).toContain(
      'event.logo_asset_id AS "logoAssetId"',
    );
    expect(db.query.mock.calls[0][0]).not.toContain(
      'category.logo_asset_id AS "logoAssetId"',
    );
    expect(snapshot.bootstrap.currentEvent).toMatchObject({
      slug: '2027-gelombang-2',
      name: 'Octal 2027 · Gelombang 2',
      periodYear: 2027,
      batchNumber: 2,
      batchLabel: 'Gelombang',
    });
    expect(snapshot.home.sections).toEqual([
      expect.objectContaining({ type: 'hero' }),
    ]);
    expect(snapshot.winners.decrees).toEqual([]);
    expect(snapshot.winners).not.toHaveProperty('decree');
    const decreeQuery = db.query.mock.calls.find(([sql]) =>
      sql.includes("document_role='winner_decree'"),
    )?.[0];
    expect(decreeQuery).toContain('default_download_label');
    expect(decreeQuery).toContain('ORDER BY doc.sort_order,doc.id');
    expect(snapshot.archiveDetail.event).toMatchObject({
      slug: '2027-gelombang-2',
      name: 'Octal 2027 · Gelombang 2',
    });
    const archiveDetailSettingsQuery = db.query.mock.calls.find(([sql]) =>
      sql.includes('FROM event_detail_settings'),
    )?.[0];
    expect(archiveDetailSettingsQuery).toContain(
      'winners_description AS "winnersDescription"',
    );
    expect(
      db.query.mock.calls.every(([, params]) => params?.[0] === 'event-1'),
    ).toBe(true);
  });

  it('uses an archive display name only for the archive snapshot section', async () => {
    const db = {
      query: jest.fn((sql: string) => {
        if (
          sql.includes('FROM event_sites event') &&
          sql.includes('event.id=$1')
        )
          return Promise.resolve([
            {
              eventId: 'event-1',
              categoryId: 'category-1',
              categoryName: 'Octal',
              categorySlug: 'octal',
              eventName: 'Octal',
              eventSlug: '2027',
              periodYear: 2027,
              batchNumber: null,
              batchLabel: null,
              organizerName: 'Talenta',
              logoAssetId: null,
              navbarLogoSize: 36,
              primaryColor: '#123456',
              navigation: {},
              contact: {},
              footer: {},
              seo: {},
              description: 'Periode baru',
              mascotAssetId: null,
              fallbackIcon: 'star',
            },
          ]);
        if (sql.includes('FROM event_detail_settings'))
          return Promise.resolve([
            {
              archiveDisplayName: 'Nama Arsip Tanpa Tahun',
              isActive: true,
            },
          ]);
        if (sql.includes('FROM home_sections')) return Promise.resolve([]);
        if (sql.includes('FROM download_tabs')) return Promise.resolve([]);
        if (sql.includes("page_type='download'")) return Promise.resolve([]);
        if (sql.includes('FROM faq_categories')) return Promise.resolve([]);
        if (sql.includes("page_type='faq'")) return Promise.resolve([]);
        if (sql.includes('FROM winner_categories')) return Promise.resolve([]);
        if (sql.includes("page_type='winners'")) return Promise.resolve([]);
        if (sql.includes('FROM winner_page_settings')) return Promise.resolve([]);
        if (sql.includes("page_type='archive'")) return Promise.resolve([]);
        if (sql.includes('FROM event_documents')) return Promise.resolve([]);
        throw new Error(`Unexpected query: ${sql}`);
      }),
    };

    const result = await new PublicContentService(db as never).build('event-1');

    expect(result.bootstrap.currentEvent).toMatchObject({ name: 'Octal 2027' });
    expect(result.winners.event).toMatchObject({ name: 'Octal 2027' });
    expect(result.archiveDetail.event).toMatchObject({
      name: 'Nama Arsip Tanpa Tahun',
    });
    const detailQuery = db.query.mock.calls.find(([sql]) =>
      sql.includes('FROM event_detail_settings'),
    )?.[0];
    expect(detailQuery).toContain(
      'archive_display_name AS "archiveDisplayName"',
    );
  });

  it('includes custom winner mode and design media in public aggregates', async () => {
    const db = {
      query: jest.fn((sql: string) => {
        if (
          sql.includes('FROM event_sites event') &&
          sql.includes('event.id=$1')
        )
          return Promise.resolve([
            {
              eventId: 'event-1',
              categoryId: 'category-1',
              categoryName: 'Octal',
              categorySlug: 'octal',
              eventName: 'Octal',
              eventSlug: '2027',
              periodYear: 2027,
              batchNumber: null,
              batchLabel: null,
              organizerName: 'Talenta',
              logoAssetId: null,
              navbarLogoSize: 36,
              primaryColor: '#123456',
              navigation: {},
              contact: {},
              footer: {},
              seo: {},
              description: '',
              mascotAssetId: null,
              fallbackIcon: 'star',
            },
          ]);
        if (sql.includes('FROM winner_categories')) {
          expect(sql).toContain("'displayMode',winner.display_mode");
          expect(sql).toContain("'designAssetId',winner.design_asset_id");
          expect(sql).toContain("'designUrl',CASE");
          expect(sql).toContain("'district',winner.district");
          return Promise.resolve([
            {
              name: 'Sains',
              winners: [
                {
                  rankLabel: 'Juara 1',
                  displayMode: 'custom',
                  designAssetId: 'design-1',
                  designUrl: '/api/v1/public/media/design-1',
                },
              ],
            },
          ]);
        }
        if (sql.includes('FROM home_sections')) return Promise.resolve([]);
        if (sql.includes('FROM download_tabs')) return Promise.resolve([]);
        if (sql.includes('FROM faq_categories')) return Promise.resolve([]);
        if (sql.includes('FROM winner_page_settings')) return Promise.resolve([]);
        if (sql.includes('FROM event_detail_settings')) return Promise.resolve([]);
        if (sql.includes('FROM event_documents')) return Promise.resolve([]);
        if (sql.includes('FROM page_settings')) return Promise.resolve([]);
        throw new Error(`Unexpected query: ${sql}`);
      }),
    };

    const result = await new PublicContentService(db as never).build('event-1');

    expect(result.winners.categories).toEqual(result.archiveDetail.categories);
    expect(result.winners.categories).toEqual([
      expect.objectContaining({
        winners: [
          expect.objectContaining({
            displayMode: 'custom',
            designAssetId: 'design-1',
            designUrl: '/api/v1/public/media/design-1',
          }),
        ],
      }),
    ]);
  });

  it('rejects restoring a snapshot for another Event', async () => {
    const service = new WorkspaceSnapshotService({} as never);
    await expect(
      service.restore(
        'event-1',
        { schemaVersion: 1, eventId: 'event-2', rows: {} },
        { query: jest.fn() },
      ),
    ).rejects.toThrow('does not match Event');
  });

  it('restores children in foreign-key-safe order', async () => {
    const calls: string[] = [];
    const service = new WorkspaceSnapshotService({} as never);
    await service.restore(
      'event-1',
      {
        schemaVersion: 1,
        eventId: 'event-1',
        rows: {
          event_sites: [
            {
              id: 'event-1',
              name: 'Octal',
              description: '',
              mascot_asset_id: null,
              fallback_icon: 'star',
            },
          ],
          faq_categories: [{ id: 'category-1', event_site_id: 'event-1' }],
          faq_questions: [{ id: 'question-1', category_id: 'category-1' }],
        },
      },
      {
        query: jest.fn((sql: string) => {
          calls.push(sql);
          return Promise.resolve([]);
        }),
      },
    );

    expect(
      calls.findIndex((sql) => sql.includes('DELETE FROM faq_questions')),
    ).toBeLessThan(
      calls.findIndex((sql) => sql.includes('DELETE FROM faq_categories')),
    );
    expect(
      calls.findIndex((sql) => sql.includes('INSERT INTO faq_categories')),
    ).toBeLessThan(
      calls.findIndex((sql) => sql.includes('INSERT INTO faq_questions')),
    );
  });

  it('fills new document fields when restoring legacy snapshots', async () => {
    const calls: Array<{ sql: string; parameters?: unknown[] }> = [];
    const executor = {
      query: jest.fn((sql: string, parameters?: unknown[]) => {
        calls.push({ sql, parameters });
        return Promise.resolve([]);
      }),
    };
    await new WorkspaceSnapshotService({} as never).restore(
      'event-1',
      {
        schemaVersion: 1,
        eventId: 'event-1',
        rows: {
          event_sites: [
            {
              id: 'event-1',
              name: 'Octal',
              description: '',
              mascot_asset_id: null,
              fallback_icon: 'star',
            },
          ],
          event_documents: [
            {
              id: 'document-1',
              event_site_id: 'event-1',
              title: 'SK lama',
              asset_id: null,
              category: 'SK Pemenang',
              file_type: 'PDF',
              is_active: true,
              sort_order: 0,
              document_role: 'winner_decree',
            },
          ],
        },
      },
      executor,
    );
    const insert = calls.find(({ sql }) => sql.includes('INSERT INTO event_documents'));
    expect(insert?.parameters?.[0]).toContain('"default_download_label":""');
  });

  it('fills the Banner title when restoring legacy winner settings', async () => {
    const calls: Array<{ sql: string; parameters?: unknown[] }> = [];
    const executor = {
      query: jest.fn((sql: string, parameters?: unknown[]) => {
        calls.push({ sql, parameters });
        return Promise.resolve([]);
      }),
    };
    await new WorkspaceSnapshotService({} as never).restore(
      'event-1',
      {
        schemaVersion: 1,
        eventId: 'event-1',
        rows: {
          event_sites: [
            {
              id: 'event-1',
              name: 'Octal',
              description: '',
              mascot_asset_id: null,
              fallback_icon: 'star',
            },
          ],
          winner_page_settings: [
            {
              event_site_id: 'event-1',
              is_active: true,
              show_decree: true,
              archive_active: true,
              archive_limit: 0,
              metadata_visibility: {},
            },
          ],
        },
      },
      executor,
    );
    const insert = calls.find(({ sql }) =>
      sql.includes('INSERT INTO winner_page_settings'),
    );
    expect(insert?.parameters?.[0]).toContain(
      '"decree_title":"SK Penetapan Pemenang"',
    );
  });

  it('captures and restores custom winner columns generically', async () => {
    const capturedWinner = {
      id: 'winner-1',
      event_site_id: 'event-1',
      display_mode: 'custom',
      design_asset_id: 'design-1',
    };
    const db = {
      query: jest.fn((sql: string) =>
        Promise.resolve(
          sql.includes('FROM event_sites')
            ? [
                {
                  id: 'event-1',
                  name: 'Octal',
                  description: '',
                  logo_asset_id: null,
                  mascot_asset_id: null,
                  fallback_icon: 'star',
                },
              ]
            : sql.includes('FROM winners row')
              ? [{ rows: [capturedWinner] }]
              : [{ rows: [] }],
        ),
      ),
    };
    const service = new WorkspaceSnapshotService(db as never);

    const snapshot = await service.capture('event-1');
    expect(snapshot.rows.winners).toEqual([capturedWinner]);

    const calls: Array<{ sql: string; parameters?: unknown[] }> = [];
    await service.restore('event-1', snapshot, {
      query: jest.fn((sql: string, parameters?: unknown[]) => {
        calls.push({ sql, parameters });
        return Promise.resolve([]);
      }),
    });
    const winnerInsert = calls.find(({ sql }) =>
      sql.includes('INSERT INTO winners'),
    );
    expect(winnerInsert?.sql).toContain(
      'jsonb_populate_recordset(NULL::winners',
    );
    expect(winnerInsert?.parameters?.[0]).toContain('"display_mode":"custom"');
    expect(winnerInsert?.parameters?.[0]).toContain(
      '"design_asset_id":"design-1"',
    );
  });

  it('captures Event logo with the workspace', async () => {
    const db = {
      query: jest.fn((sql: string) =>
        Promise.resolve(
          sql.includes('FROM event_sites')
            ? [
                {
                  id: 'event-1',
                  name: 'Octal',
                  description: '',
                  logo_asset_id: 'logo-1',
                  mascot_asset_id: null,
                  fallback_icon: 'star',
                },
              ]
            : [{ rows: [] }],
        ),
      ),
    };

    const snapshot = await new WorkspaceSnapshotService(db as never).capture(
      'event-1',
    );

    expect(snapshot.rows.event_sites[0].logo_asset_id).toBe('logo-1');
  });

  it('restores legacy snapshots without clearing the current Event logo', async () => {
    const calls: Array<{ sql: string; parameters?: unknown[] }> = [];
    const executor = {
      query: jest.fn((sql: string, parameters?: unknown[]) => {
        calls.push({ sql, parameters });
        return Promise.resolve([]);
      }),
    };
    const service = new WorkspaceSnapshotService({} as never);

    await service.restore(
      'event-1',
      {
        schemaVersion: 1,
        eventId: 'event-1',
        rows: {
          event_sites: [
            {
              id: 'event-1',
              name: 'Octal',
              description: '',
              mascot_asset_id: null,
              fallback_icon: 'star',
            },
          ],
          site_settings: [
            {
              event_site_id: 'event-1',
              primary_color: '#123456',
              navigation: {},
              contact: {},
              footer: {},
              seo: {},
            },
          ],
        },
      },
      executor,
    );

    const eventUpdate = calls.find(({ sql }) =>
      sql.includes('UPDATE event_sites'),
    );
    expect(eventUpdate?.sql).toContain(
      'CASE WHEN $6 THEN $7::uuid ELSE logo_asset_id END',
    );
    const settingsInsert = calls.find(({ sql }) =>
      sql.includes('jsonb_populate_recordset'),
    );
    expect(settingsInsert?.parameters?.[0]).toContain('"navbar_logo_size":36');
  });

  it('restores new snapshot with explicit null logo asset id', async () => {
    const calls: Array<{ sql: string; parameters?: unknown[] }> = [];
    const executor = {
      query: jest.fn((sql: string, parameters?: unknown[]) => {
        calls.push({ sql, parameters });
        return Promise.resolve([]);
      }),
    };
    const service = new WorkspaceSnapshotService({} as never);

    await service.restore(
      'event-1',
      {
        schemaVersion: 1,
        eventId: 'event-1',
        rows: {
          event_sites: [
            {
              id: 'event-1',
              name: 'Octal',
              description: '',
              logo_asset_id: null,
              mascot_asset_id: null,
              fallback_icon: 'star',
            },
          ],
        },
      },
      executor,
    );

    const eventUpdate = calls.find(({ sql }) =>
      sql.includes('UPDATE event_sites'),
    );
    expect(eventUpdate?.parameters).toEqual([
      'event-1',
      'Octal',
      '',
      null,
      'star',
      true,
      null,
    ]);
  });
});
