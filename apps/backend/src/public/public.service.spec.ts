import { PublicService } from './public.service';

const snapshot = {
  schemaVersion: 1,
  bootstrap: {
    site: { slug: 'octal', name: 'Octal' },
    settings: {},
    routes: [],
    currentEvent: { slug: '2027', name: 'Octal 2027' },
  },
  home: { site: { slug: 'octal' }, sections: [{ type: 'hero' }] },
  downloads: { site: {}, page: null, tabs: [] },
  faq: { site: {}, page: null, categories: [] },
  winners: { site: {}, event: {}, categories: [], settings: {} },
  archivePage: { site: {}, page: null },
  archiveDetail: { event: { slug: '2027' }, categories: [], documents: [] },
};

describe('PublicService publication resolution', () => {
  it('reads the published snapshot for normal public pages', async () => {
    const db = {
      query: jest.fn().mockResolvedValue([
        { eventId: 'event-1', categoryId: 'category-1', snapshot },
      ]),
    };
    const service = new PublicService(
      db as never,
      {} as never,
      {} as never,
    );

    const result = await service.home('octal');

    expect(result.data.sections).toEqual([{ type: 'hero' }]);
    expect(db.query.mock.calls[0][0]).toContain(
      "category.publication_status='published'",
    );
    expect(db.query.mock.calls[0][0]).toContain(
      'publication.public_snapshot',
    );
  });

  it('hides the batch suffix until a later batch has been activated', async () => {
    const batchedSnapshot = {
      ...snapshot,
      bootstrap: {
        ...snapshot.bootstrap,
        currentEvent: {
          slug: '2026-gelombang-1',
          name: 'Octal 2026 · Gelombang 1',
        },
      },
    };
    const db = {
      query: jest.fn().mockResolvedValue([
        {
          eventId: 'event-1',
          categoryId: 'category-1',
          snapshot: batchedSnapshot,
          baseName: 'Octal',
          periodYear: 2026,
          batchNumber: 1,
          batchLabel: 'Gelombang',
          showBatch: false,
        },
      ]),
    };
    const service = new PublicService(db as never, {} as never, {} as never);

    const result = await service.bootstrapBySlug('octal');

    expect(result.data.currentEvent).toEqual(
      expect.objectContaining({ name: 'Octal 2026' }),
    );
  });

  it('uses the exact preview Event and current membership', async () => {
    const db = {
      query: jest.fn().mockResolvedValue([
        {
          eventId: 'event-draft',
          categoryId: 'category-1',
          categorySlug: 'octal',
        },
      ]),
    };
    const preview = {
      verify: jest.fn().mockResolvedValue({
        purpose: 'event-preview',
        sub: 'user-1',
        organizationId: 'organization-1',
        categoryId: 'category-1',
        eventId: 'event-draft',
      }),
    };
    const content = { build: jest.fn().mockResolvedValue(snapshot) };
    const service = new PublicService(
      db as never,
      content as never,
      preview as never,
    );

    await service.home('octal', 'preview-token');

    expect(content.build).toHaveBeenCalledWith('event-draft');
    expect(db.query.mock.calls[0][0]).toContain('membership.user_id=$3');
  });

  it('returns every published non-active Event as an automatic archive', async () => {
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          { eventId: 'event-1', categoryId: 'category-1', snapshot },
        ])
        .mockResolvedValueOnce([
          {
            snapshot: {
              archiveDetail: {
                event: { slug: '2026', name: 'Octal 2026' },
              },
            },
            eventSlug: '2026-gelombang-1',
            baseName: 'Octal',
            periodYear: 2026,
            batchNumber: 1,
            batchLabel: 'Gelombang',
            showBatch: true,
          },
        ]),
    };
    const service = new PublicService(
      db as never,
      {} as never,
      {} as never,
    );

    const result = await service.archives('octal');

    expect(result.data.events).toEqual([
      expect.objectContaining({
        slug: '2026-gelombang-1',
        name: 'Octal 2026 · Gelombang 1',
      }),
    ]);
    expect(db.query.mock.calls[1][0]).toContain('event.period_year < current_event.period_year');
  });
});
