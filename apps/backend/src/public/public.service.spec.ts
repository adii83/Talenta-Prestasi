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
      expect.objectContaining({ slug: '2026' }),
    ]);
    expect(db.query.mock.calls[1][0]).toContain('event.is_active=false');
  });
});
