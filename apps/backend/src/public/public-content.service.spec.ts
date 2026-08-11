import { PublicContentService } from './public-content.service';
import { WorkspaceSnapshotService } from './workspace-snapshot.service';

describe('PublicContentService', () => {
  it('builds a complete snapshot for exactly one Event', async () => {
    const db = {
      query: jest.fn((sql: string) => {
        if (sql.includes('FROM event_sites event') && sql.includes('event.id=$1'))
          return Promise.resolve([
            {
              eventId: 'event-1',
              categoryId: 'category-1',
              categoryName: 'Octal',
              categorySlug: 'octal',
              eventName: 'Octal 2027',
              eventSlug: '2027',
              organizerName: 'Talenta',
              logoAssetId: null,
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
        if (sql.includes('FROM winner_page_settings')) return Promise.resolve([]);
        if (sql.includes('FROM event_detail_settings')) return Promise.resolve([]);
        if (sql.includes("page_type='archive'")) return Promise.resolve([]);
        if (sql.includes('FROM event_documents')) return Promise.resolve([]);
        throw new Error(`Unexpected query: ${sql}`);
      }),
    };

    const snapshot = await new PublicContentService(db as never).build('event-1');

    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.bootstrap.currentEvent).toMatchObject({ slug: '2027' });
    expect(snapshot.home.sections).toEqual([
      expect.objectContaining({ type: 'hero' }),
    ]);
    expect(snapshot.archiveDetail.event).toMatchObject({ slug: '2027' });
    expect(
      db.query.mock.calls.every(([, params]) => params?.[0] === 'event-1'),
    ).toBe(true);
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

    expect(calls.findIndex((sql) => sql.includes('DELETE FROM faq_questions'))).toBeLessThan(
      calls.findIndex((sql) => sql.includes('DELETE FROM faq_categories')),
    );
    expect(calls.findIndex((sql) => sql.includes('INSERT INTO faq_categories'))).toBeLessThan(
      calls.findIndex((sql) => sql.includes('INSERT INTO faq_questions')),
    );
  });
});
