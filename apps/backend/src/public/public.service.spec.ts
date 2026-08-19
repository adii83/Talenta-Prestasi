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

  it('previews the selected historical Event from its workspace on its own detail page', async () => {
    const archiveSnapshot = {
      ...snapshot,
      archiveDetail: {
        event: {
          slug: '2026',
          name: 'Nama Draf Tanpa Tahun',
          mascotAssetId: 'asset-draft',
        },
        settings: { archiveDisplayName: 'Nama Draf Tanpa Tahun' },
        categories: [],
        documents: [],
      },
    };
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            eventId: 'event-archive',
            categoryId: 'category-1',
            categorySlug: 'octal',
          },
        ])
        .mockResolvedValueOnce([]),
    };
    const preview = {
      verify: jest.fn().mockResolvedValue({
        purpose: 'event-preview',
        sub: 'user-1',
        organizationId: 'organization-1',
        categoryId: 'category-1',
        eventId: 'event-archive',
      }),
    };
    const content = { build: jest.fn().mockResolvedValue(archiveSnapshot) };
    const service = new PublicService(
      db as never,
      content as never,
      preview as never,
    );

    const result = await service.archiveDetail(
      'octal',
      'event-archive',
      'preview-token',
    );

    expect(result.preview).toBe(true);
    expect(result.data.event).toEqual(
      expect.objectContaining({
        name: 'Nama Draf Tanpa Tahun',
        mascotAssetId: 'asset-draft',
      }),
    );
    expect(content.build).toHaveBeenCalledWith('event-archive');
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('keeps normal public archive detail on the published snapshot', async () => {
    const publishedArchiveSnapshot = {
      ...snapshot,
      archiveDetail: {
        event: {
          slug: '2026',
          name: 'Nama Publik Lama',
          mascotAssetId: 'asset-published',
        },
        settings: { archiveDisplayName: 'Nama Publik Lama' },
        categories: [],
        documents: [],
      },
    };
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          { eventId: 'event-1', categoryId: 'category-1', snapshot },
        ])
        .mockResolvedValueOnce([
          {
            eventId: 'event-archive',
            snapshot: publishedArchiveSnapshot,
            eventSlug: '2026',
            baseName: 'Octal',
            periodYear: 2026,
            batchNumber: null,
            batchLabel: null,
            showBatch: false,
          },
        ]),
    };
    const content = { build: jest.fn() };
    const service = new PublicService(
      db as never,
      content as never,
      {} as never,
    );

    const result = await service.archiveDetail('octal', '2026');

    expect(result.preview).toBe(false);
    expect(result.data.event).toEqual(
      expect.objectContaining({
        name: 'Nama Publik Lama',
        mascotAssetId: 'asset-published',
      }),
    );
    expect(content.build).not.toHaveBeenCalled();
  });

  it('previews updated archive identities from their workspaces in archive cards', async () => {
    const archiveAssetId = '11111111-1111-4111-8111-111111111111';
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            eventId: 'event-active',
            categoryId: 'category-1',
            categorySlug: 'octal',
          },
        ])
        .mockResolvedValueOnce([
          {
            eventId: 'event-archive',
            snapshot: {
              archiveDetail: {
                event: {
                  slug: '2026',
                  name: 'Octal 2026',
                  mascotAssetId: 'asset-published',
                  fallbackIcon: 'archive',
                },
              },
            },
            eventSlug: '2026',
            baseName: 'Octal',
            mascotAssetId: archiveAssetId,
            fallbackIcon: 'star',
            periodYear: 2026,
            batchNumber: null,
            batchLabel: null,
            showBatch: false,
          },
        ]),
    };
    const preview = {
      verify: jest.fn().mockResolvedValue({
        purpose: 'event-preview',
        sub: 'user-1',
        organizationId: 'organization-1',
        categoryId: 'category-1',
        eventId: 'event-active',
      }),
    };
    const content = {
      build: jest.fn((eventId: string) =>
        Promise.resolve(
          eventId === 'event-active'
            ? snapshot
            : {
                ...snapshot,
                archiveDetail: {
                  event: {
                    slug: '2026',
                    name: 'Octal 2026',
                    mascotAssetId: archiveAssetId,
                    fallbackIcon: 'star',
                  },
                  categories: [],
                  documents: [],
                },
              },
        ),
      ),
    };
    const service = new PublicService(
      db as never,
      content as never,
      preview as never,
    );

    const result = await service.archives('octal', 'preview-token');

    expect(result.preview).toBe(true);
    expect(result.data.events[0]).toEqual(
      expect.objectContaining({
        mascotAssetId: archiveAssetId,
        fallbackIcon: 'star',
      }),
    );
  });

  it('includes mascotAssetId in winners page archive summaries when previewing', async () => {
    const archiveAssetId = '11111111-1111-4111-8111-111111111111';
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            eventId: 'event-active',
            categoryId: 'category-1',
            categorySlug: 'octal',
          },
        ])
        .mockResolvedValueOnce([
          {
            eventId: 'event-archive',
            snapshot: {
              archiveDetail: {
                event: {
                  slug: '2026',
                  name: 'Octal 2026',
                  mascotAssetId: 'asset-published',
                },
              },
            },
            eventSlug: '2026',
            baseName: 'Octal',
            mascotAssetId: archiveAssetId,
            fallbackIcon: 'star',
            periodYear: 2026,
            batchNumber: null,
            batchLabel: null,
            showBatch: false,
          },
        ]),
    };
    const preview = {
      verify: jest.fn().mockResolvedValue({
        purpose: 'event-preview',
        sub: 'user-1',
        organizationId: 'organization-1',
        categoryId: 'category-1',
        eventId: 'event-active',
      }),
    };
    const content = { build: jest.fn().mockResolvedValue(snapshot) };
    const service = new PublicService(
      db as never,
      content as never,
      preview as never,
    );

    const result = await service.winners('octal', 'preview-token');

    expect(result.preview).toBe(true);
    expect(result.data.archives[0]).toEqual(
      expect.objectContaining({
        mascotAssetId: archiveAssetId,
        fallbackIcon: 'star',
      }),
    );
  });

  it('uses a saved archive display name verbatim in archive cards', async () => {
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
                settings: {
                  archiveDisplayName: 'Nama Arsip Tanpa Tahun',
                },
              },
            },
            eventSlug: '2026',
            baseName: 'Octal',
            periodYear: 2026,
            batchNumber: null,
            batchLabel: null,
            showBatch: false,
          },
        ]),
    };
    const service = new PublicService(db as never, {} as never, {} as never);

    const result = await service.archives('octal');

    expect(result.data.events[0].name).toBe('Nama Arsip Tanpa Tahun');
  });

  it('keeps the generated period name for legacy archive snapshots', async () => {
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
                event: { slug: '2026', name: 'Stale Snapshot Name' },
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
    const service = new PublicService(db as never, {} as never, {} as never);

    const result = await service.archives('octal');

    expect(result.data.events[0].name).toBe('Octal 2026 · Gelombang 1');
  });

  it('uses the saved archive display name for archive detail responses', async () => {
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          { eventId: 'event-1', categoryId: 'category-1', snapshot },
        ])
        .mockResolvedValueOnce([
          {
            eventId: 'event-archive',
            snapshot: {
              archiveDetail: {
                event: { slug: '2026', name: 'Octal 2026' },
                settings: {
                  archiveDisplayName: 'Nama Arsip Tanpa Tahun',
                },
              },
            },
            eventSlug: '2026',
            baseName: 'Octal',
            periodYear: 2026,
            batchNumber: null,
            batchLabel: null,
            showBatch: false,
          },
        ]),
    };
    const service = new PublicService(db as never, {} as never, {} as never);

    const result = await service.archiveDetail('octal', '2026');

    expect(result.data.event.name).toBe('Nama Arsip Tanpa Tahun');
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
