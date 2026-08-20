import { ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';

const queryResult = (sql: string) => {
  if (sql.includes('FROM organization_memberships'))
    return [
      {
        organizationId: '11111111-1111-4111-8111-111111111111',
        organizationName: 'Talenta',
        role: 'owner',
      },
    ];
  if (sql.includes('SELECT id FROM competition_categories')) return [];
  throw new Error(`Unexpected query: ${sql}`);
};

describe('AdminService category flow', () => {
  it('creates a category without writing an event-scoped audit row', async () => {
    const manager = {
      query: jest.fn((sql: string) => Promise.resolve(queryResult(sql))),
      create: jest.fn((_entity, input) => ({
        id: '22222222-2222-4222-8222-222222222222',
        ...input,
      })),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new AdminService(
      {} as never,
      {} as never,
      dataSource as never,
      { get: jest.fn() } as unknown as ConfigService,
    );

    await service.createCategory('33333333-3333-4333-8333-333333333333', {
      name: 'Octal',
      slug: 'octal',
    });

    expect(manager.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      expect.anything(),
    );
  });

  it('updates category metadata without changing its slug', async () => {
    const manager = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: '22222222-2222-4222-8222-222222222222',
            organizationId: '11111111-1111-4111-8111-111111111111',
            slug: 'octal',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: '22222222-2222-4222-8222-222222222222',
            name: 'Octal Nasional',
            organizerName: 'Talenta Baru',
            slug: 'octal',
          },
        ]),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new AdminService(
      {} as never,
      {} as never,
      dataSource as never,
      { get: jest.fn() } as unknown as ConfigService,
    );

    const result = await service.updateCategory(
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
      { name: 'Octal Nasional', organizerName: 'Talenta Baru' },
    );

    expect(manager.query.mock.calls[1][0]).not.toContain('slug=');
    expect(result.data.slug).toBe('octal');
  });

  it('lists categories independently from session metadata', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Octal',
          slug: 'octal',
        },
      ]),
    };
    const service = new AdminService(
      {} as never,
      {} as never,
      dataSource as never,
      { get: jest.fn() } as unknown as ConfigService,
    );

    const result = await service.listCategories(
      '33333333-3333-4333-8333-333333333333',
    );

    expect(result.data).toHaveLength(1);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM competition_categories'),
      ['33333333-3333-4333-8333-333333333333'],
    );
  });

  it.each([
    [
      'home',
      (service: AdminService) =>
        service.putHome(
          '44444444-4444-4444-8444-444444444444',
          '33333333-3333-4333-8333-333333333333',
          [],
        ),
    ],
    [
      'downloads',
      (service: AdminService) =>
        service.putDownloads(
          '44444444-4444-4444-8444-444444444444',
          '33333333-3333-4333-8333-333333333333',
          [],
        ),
    ],
  ])('requires write access before updating %s', async (_name, write) => {
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest
        .fn()
        .mockResolvedValue({ id: '44444444-4444-4444-8444-444444444444' }),
    };
    const dataSource = {
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn(),
    };
    const service = new AdminService(
      {} as never,
      { createQueryBuilder: jest.fn(() => queryBuilder) } as never,
      dataSource as never,
      { get: jest.fn() } as unknown as ConfigService,
    );

    await expect(write(service)).rejects.toThrow('Event write access denied');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('validates and canonicalizes the Hero media reference before saving home', async () => {
    const eventId = '44444444-4444-4444-8444-444444444444';
    const userId = '33333333-3333-4333-8333-333333333333';
    const assetId = '55555555-5555-4555-8555-555555555555';
    const manager = {
      query: jest
        .fn()
        .mockResolvedValueOnce([[{ workspaceRevision: 2 }], 1])
        .mockResolvedValueOnce([{ id: assetId }])
        .mockResolvedValue([]),
    };
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: eventId }),
    };
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ id: eventId }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ workspaceRevision: 1 }]),
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new AdminService(
      {} as never,
      { createQueryBuilder: jest.fn(() => queryBuilder) } as never,
      dataSource as never,
      { get: jest.fn() } as unknown as ConfigService,
    );

    await service.putHome(eventId, userId, [
      {
        sectionType: 'hero',
        isActive: true,
        settings: {
          image: `http://localhost:3000/api/v1/public/media/${assetId}`,
        },
      },
    ], 1);

    expect(manager.query.mock.calls[1][0]).toContain('FROM media_assets asset');
    expect(manager.query.mock.calls[1][1]).toEqual([
      eventId,
      assetId,
      ['image/png', 'image/jpeg', 'image/webp'],
      2 * 1024 * 1024,
    ]);
    expect(manager.query.mock.calls[3][1][4]).toEqual({
      image: `/api/v1/public/media/${assetId}`,
    });
  });

  it('rejects a Hero media reference outside the Event organization or limits', async () => {
    const eventId = '44444444-4444-4444-8444-444444444444';
    const userId = '33333333-3333-4333-8333-333333333333';
    const assetId = '55555555-5555-4555-8555-555555555555';
    const manager = {
      query: jest.fn().mockResolvedValueOnce([[{ workspaceRevision: 2 }], 1]).mockResolvedValue([]),
    };
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ id: eventId }]),
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new AdminService(
      {} as never,
      {} as never,
      dataSource as never,
      { get: jest.fn() } as unknown as ConfigService,
    );

    await expect(
      service.putHome(eventId, userId, [
        {
          sectionType: 'hero',
          isActive: true,
          settings: { image: `/api/v1/public/media/${assetId}` },
        },
      ], 1),
    ).rejects.toThrow('Invalid Hero image');
    expect(manager.query).toHaveBeenCalledTimes(2);
  });

  it('updates event metadata without changing its slug', async () => {
    const manager = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: '44444444-4444-4444-8444-444444444444',
            categoryId: '22222222-2222-4222-8222-222222222222',
            organizationId: '11111111-1111-4111-8111-111111111111',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: '44444444-4444-4444-8444-444444444444',
            name: 'Octal 2027',
            slug: '2026',
            description: 'Periode baru',
          },
        ]),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new AdminService(
      {} as never,
      {} as never,
      dataSource as never,
      { get: jest.fn() } as unknown as ConfigService,
    );

    const result = await service.updateEvent(
      '44444444-4444-4444-8444-444444444444',
      '33333333-3333-4333-8333-333333333333',
      { description: 'Periode baru' },
    );

    expect(manager.query.mock.calls[1][0]).not.toContain('slug=');
    expect(result.data.slug).toBe('2026');
  });

  describe('archive Event identity', () => {
    it('preserves omitted icon fields during a partial update', async () => {
      const manager = {
        query: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'event-1',
              categoryId: 'category-1',
              organizationId: 'organization-1',
            },
          ])
          .mockResolvedValueOnce([
            {
              id: 'event-1',
              description: 'Deskripsi baru',
              fallbackIcon: 'star',
              mascotAssetId: 'asset-1',
            },
          ]),
      };
      const service = new AdminService(
        {} as never,
        {} as never,
        { transaction: jest.fn((callback) => callback(manager)) } as never,
        { get: jest.fn() } as unknown as ConfigService,
      );

      await service.updateEvent('event-1', 'user-1', {
        description: 'Deskripsi baru',
      });

      expect(manager.query.mock.calls[1][0]).toContain(
        'fallback_icon=CASE WHEN $4 THEN $5 ELSE fallback_icon END',
      );
      expect(manager.query.mock.calls[1][0]).toContain(
        'mascot_asset_id=CASE WHEN $6 THEN $7::uuid ELSE mascot_asset_id END',
      );
      expect(manager.query.mock.calls[1][1]).toEqual([
        'event-1',
        true,
        'Deskripsi baru',
        false,
        null,
        false,
        null,
      ]);
    });

    it('removes an uploaded icon only when mascotAssetId is explicitly null', async () => {
      const manager = {
        query: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'event-1',
              categoryId: 'category-1',
              organizationId: 'organization-1',
            },
          ])
          .mockResolvedValueOnce([
            {
              id: 'event-1',
              fallbackIcon: 'star',
              mascotAssetId: null,
            },
          ]),
      };
      const service = new AdminService(
        {} as never,
        {} as never,
        { transaction: jest.fn((callback) => callback(manager)) } as never,
        { get: jest.fn() } as unknown as ConfigService,
      );

      await service.updateEvent('event-1', 'user-1', {
        mascotAssetId: null,
      } as never);

      expect(manager.query.mock.calls[1][1]).toEqual([
        'event-1',
        false,
        null,
        false,
        null,
        true,
        null,
      ]);
    });

    it('rejects a fallback icon outside the approved library', async () => {
      const manager = {
        query: jest.fn().mockResolvedValueOnce([
          {
            id: 'event-1',
            categoryId: 'category-1',
            organizationId: 'organization-1',
          },
        ]),
      };
      const service = new AdminService(
        {} as never,
        {} as never,
        { transaction: jest.fn((callback) => callback(manager)) } as never,
        { get: jest.fn() } as unknown as ConfigService,
      );

      await expect(
        service.updateEvent('event-1', 'user-1', {
          fallbackIcon: 'ikon-tidak-disetujui',
        }),
      ).rejects.toThrow('Invalid fallback icon');
      expect(manager.query).toHaveBeenCalledTimes(1);
    });

    it('returns canonical icon fields in the category Event list', async () => {
      const dataSource = {
        query: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'category-1' }])
          .mockResolvedValueOnce([
            {
              id: 'event-1',
              fallbackIcon: 'star',
              mascotAssetId: 'asset-1',
            },
          ]),
      };
      const service = new AdminService(
        {} as never,
        {} as never,
        dataSource as never,
        { get: jest.fn() } as unknown as ConfigService,
      );

      const result = await service.categoryEvents('category-1', 'user-1');

      expect(result.data[0]).toMatchObject({
        fallbackIcon: 'star',
        mascotAssetId: 'asset-1',
      });
      expect(dataSource.query.mock.calls[1][0]).toContain(
        'event.fallback_icon AS "fallbackIcon"',
      );
      expect(dataSource.query.mock.calls[1][0]).toContain(
        'event.mascot_asset_id AS "mascotAssetId"',
      );
      expect(dataSource.query.mock.calls[1][0]).toContain(
        'detail.archive_display_name AS "archiveDisplayName"',
      );
      expect(dataSource.query.mock.calls[1][0]).toContain(
        'LEFT JOIN event_detail_settings detail',
      );
    });

    it('returns canonical icon fields for one Event', async () => {
      const queryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'event-1',
          name: 'Octal',
          slug: '2026',
          description: '',
          fallbackIcon: 'star',
          mascotAssetId: 'asset-1',
          categoryId: 'category-1',
        }),
      };
      const service = new AdminService(
        {} as never,
        { createQueryBuilder: jest.fn(() => queryBuilder) } as never,
        { query: jest.fn().mockResolvedValue([{ workspaceRevision: 1 }]) } as never,
        { get: jest.fn() } as unknown as ConfigService,
      );

      const result = await service.event('event-1', 'user-1');

      expect(result.data).toMatchObject({
        fallbackIcon: 'star',
        mascotAssetId: 'asset-1',
      });
    });
  });

  describe('create Event from latest template', () => {
    const category = {
      id: 'category-1',
      organizationId: 'organization-1',
      name: 'Octal',
      slug: 'octal',
    };
    const template = {
      id: 'event-source',
      description: 'Deskripsi sumber',
      logoAssetId: 'asset-logo-source',
      mascotAssetId: 'asset-mascot-source',
      fallbackIcon: 'star',
    };

    const buildManager = (options: {
      includeTemplate?: boolean;
      failClone?: boolean;
    } = {}) => {
      const query = jest.fn(async (sql: string) => {
        if (sql.includes('FROM competition_categories c')) return [category];
        if (sql.includes('COALESCE(batch_number,1) DESC'))
          return options.includeTemplate === false ? [] : [template];
        if (sql.includes('WHERE category_id=$1 AND period_year=$2')) return [];
        if (options.failClone && sql.includes('UPDATE site_settings target'))
          throw new Error('clone failed');
        if (sql.includes('SELECT id,section_type AS "sectionType"'))
          return [
            {
              id: 'section-source',
              sectionType: 'pricing',
              isActive: true,
              sortOrder: 0,
              settings: { title: 'Biaya' },
            },
          ];
        if (sql.includes('INSERT INTO home_sections'))
          return [{ id: 'section-target' }];
        if (sql.includes('SELECT id,title,price'))
          return [
            {
              id: 'package-source',
              title: 'Paket A',
              price: '100000',
              isFeatured: true,
              actionLabel: 'Daftar',
              actionUrl: '/daftar',
              isActive: true,
              sortOrder: 0,
            },
          ];
        if (sql.includes('INSERT INTO pricing_packages'))
          return [{ id: 'package-target' }];
        if (sql.includes('SELECT id,title,is_active AS "isActive"'))
          return [
            {
              id: 'faq-category-source',
              title: 'Umum',
              isActive: true,
              sortOrder: 0,
            },
          ];
        if (sql.includes('INSERT INTO faq_categories'))
          return [{ id: 'faq-category-target' }];
        return [];
      });
      const manager = {
        query,
        create: jest.fn((_entity, input) => ({ id: 'event-target', ...input })),
        save: jest.fn((value) => Promise.resolve(value)),
      };
      return manager;
    };

    const buildService = (manager: ReturnType<typeof buildManager>) =>
      new AdminService(
        {} as never,
        {} as never,
        { transaction: jest.fn((callback) => callback(manager)) } as never,
        { get: jest.fn() } as unknown as ConfigService,
      );

    it('preserves create behavior when template use is omitted', async () => {
      const manager = buildManager();
      const service = buildService(manager);

      await service.createEvent('category-1', 'user-1', {
        periodYear: 2028,
        batchEnabled: false,
      });

      expect(
        manager.query.mock.calls.some(([sql]) =>
          sql.includes('COALESCE(batch_number,1) DESC'),
        ),
      ).toBe(false);
    });

    it('selects the latest live Event and clones only reusable workspace data', async () => {
      const manager = buildManager();
      const service = buildService(manager);

      await service.createEvent('category-1', 'user-1', {
        periodYear: 2028,
        batchEnabled: false,
        useLatestTemplate: true,
      } as never);

      const sourceCall = manager.query.mock.calls.find(([sql]) =>
        sql.includes('COALESCE(batch_number,1) DESC'),
      );
      expect(sourceCall?.[0]).toMatch(
        /deleted_at IS NULL[\s\S]*period_year DESC NULLS LAST[\s\S]*COALESCE\(batch_number,1\) DESC[\s\S]*created_at DESC[\s\S]*id DESC/,
      );
      expect(sourceCall?.[0]).not.toMatch(/is_active|publication|status=/);
      expect(sourceCall?.[1]).toEqual(['category-1']);

      expect(manager.create.mock.calls[0][1]).toMatchObject({
        description: 'Deskripsi sumber',
        logoAssetId: 'asset-logo-source',
        mascotAssetId: 'asset-mascot-source',
        fallbackIcon: 'star',
        isActive: false,
        status: 'active',
      });

      const sql = manager.query.mock.calls
        .map(([statement]) => statement)
        .join('\n');
      expect(sql).toContain('UPDATE site_settings target');
      expect(sql).toContain('INSERT INTO home_sections');
      expect(sql).toContain('INSERT INTO faq_categories');
      expect(sql).toContain('INSERT INTO faq_questions');
      expect(sql).toContain('INSERT INTO page_settings');
      expect(sql).toContain('INSERT INTO winner_page_settings');
      expect(sql).toContain('INSERT INTO winner_categories');
      expect(sql).not.toMatch(
        /INSERT INTO (event_documents|download_tabs|download_document_settings|winners|event_detail_settings|archive_category_settings|archive_document_settings|event_publications|event_publication_assets|media_assets)/,
      );

      const facilityCall = manager.query.mock.calls.find(([statement]) =>
        statement.includes('INSERT INTO pricing_facilities'),
      );
      expect(facilityCall?.[0]).toContain(
        'JOIN package_map map ON map.source_id=facility.package_id',
      );
      expect(facilityCall?.[0]).toContain('SELECT map.target_id');
      expect(facilityCall?.[1]).toEqual(['event-source', 'event-target']);
      const questionCall = manager.query.mock.calls.find(([statement]) =>
        statement.includes('INSERT INTO faq_questions'),
      );
      expect(questionCall?.[0]).toContain(
        'JOIN category_map map ON map.source_id=question.category_id',
      );
      expect(questionCall?.[0]).toContain('SELECT map.target_id');
      expect(questionCall?.[1]).toEqual(['event-source', 'event-target']);

      const auditCall = manager.query.mock.calls.find(([statement]) =>
        statement.includes("'create','event_site'"),
      );
      expect(JSON.parse(auditCall?.[1]?.[2] as string)).toMatchObject({
        templateSourceEventId: 'event-source',
        templateModules: [
          'site_settings',
          'home',
          'faq',
          'page_settings',
          'winner_page_settings',
          'winner_categories',
        ],
      });
    });

    it('returns 409 when template use is requested without a source Event', async () => {
      const manager = buildManager({ includeTemplate: false });
      const service = buildService(manager);

      await expect(
        service.createEvent('category-1', 'user-1', {
          periodYear: 2028,
          batchEnabled: false,
          useLatestTemplate: true,
        } as never),
      ).rejects.toThrow('Template Event sebelumnya tidak tersedia');
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('propagates clone failure before writing the create audit', async () => {
      const manager = buildManager({ failClone: true });
      const service = buildService(manager);

      await expect(
        service.createEvent('category-1', 'user-1', {
          periodYear: 2028,
          batchEnabled: false,
          useLatestTemplate: true,
        } as never),
      ).rejects.toThrow('clone failed');
      expect(
        manager.query.mock.calls.some(([sql]) =>
          sql.includes("'create','event_site'"),
        ),
      ).toBe(false);
    });
  });

  describe('delete Event batch reconciliation', () => {
    const buildService = (manager: {
      query: jest.Mock;
    }) =>
      new AdminService(
        {} as never,
        {} as never,
        { transaction: jest.fn((cb) => cb(manager)) } as never,
        { get: jest.fn() } as unknown as ConfigService,
      );

    it('releases the deleted Event batch slot on soft delete', async () => {
      const manager = {
        query: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'event-2',
              categoryId: 'category-1',
              organizationId: 'organization-1',
            },
          ]) // authorizedEvent
          .mockResolvedValueOnce([{ periodYear: 2026, batchNumber: 2 }]) // period identity
          .mockResolvedValueOnce([]) // soft delete
          .mockResolvedValueOnce([{ id: 'event-1', batchLabel: 'Gelombang' }]), // live events
      };
      const service = buildService(manager);

      await service.deleteEvent('event-2', 'user-1');

      expect(manager.query.mock.calls[2][0]).toContain('batch_number=NULL');
      expect(manager.query.mock.calls[2][0]).toContain('batch_label=NULL');
      expect(manager.query.mock.calls[2][0]).toContain("status='suspended'");
      expect(manager.query.mock.calls[2][1]).toEqual(['event-2']);
    });

    it('demotes the sole surviving batch to an unbatched Event', async () => {
      const manager = {
        query: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'event-2',
              categoryId: 'category-1',
              organizationId: 'organization-1',
            },
          ])
          .mockResolvedValueOnce([{ periodYear: 2026, batchNumber: 2 }])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: 'event-1', batchLabel: 'Gelombang' }])
          .mockResolvedValueOnce([]), // demote update
      };
      const service = buildService(manager);

      await service.deleteEvent('event-2', 'user-1');

      const demote = manager.query.mock.calls[4];
      expect(demote[0]).toContain('batch_number=NULL');
      expect(demote[0]).toContain('batch_label=NULL');
      expect(demote[1]).toEqual(['event-1', '2026']);
    });

    it('renumbers surviving batches sequentially when a middle wave is deleted', async () => {
      const manager = {
        query: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'event-3',
              categoryId: 'category-1',
              organizationId: 'organization-1',
            },
          ])
          .mockResolvedValueOnce([{ periodYear: 2026, batchNumber: 3 }])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { id: 'event-1', batchLabel: 'Gelombang' },
            { id: 'event-2', batchLabel: 'Gelombang' },
            { id: 'event-4', batchLabel: 'Gelombang' },
            { id: 'event-5', batchLabel: 'Gelombang' },
          ])
          .mockResolvedValue([]), // renumber updates
      };
      const service = buildService(manager);

      await service.deleteEvent('event-3', 'user-1');

      const renumberCalls = manager.query.mock.calls
        .slice(4)
        .map((call) => ({ sql: call[0], params: call[1] }));
      const assigned = renumberCalls.map((call) => ({
        id: call.params[0],
        batchNumber: call.params[1],
        label: call.params[2],
        slug: call.params[3],
      }));
      expect(assigned).toEqual([
        { id: 'event-1', batchNumber: 1, label: 'Gelombang', slug: '2026-gelombang-1' },
        { id: 'event-2', batchNumber: 2, label: 'Gelombang', slug: '2026-gelombang-2' },
        { id: 'event-4', batchNumber: 3, label: 'Gelombang', slug: '2026-gelombang-3' },
        { id: 'event-5', batchNumber: 4, label: 'Gelombang', slug: '2026-gelombang-4' },
      ]);
    });

    it('skips reconciliation when the deleted Event has no period identity', async () => {
      const manager = {
        query: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'event-9',
              categoryId: 'category-1',
              organizationId: 'organization-1',
            },
          ])
          .mockResolvedValueOnce([{ periodYear: null, batchNumber: null }])
          .mockResolvedValueOnce([]), // soft delete only
      };
      const service = buildService(manager);

      await service.deleteEvent('event-9', 'user-1');

      expect(manager.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('settings read and write', () => {
    it('returns event logo settings on read', async () => {
      const queryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'event-1',
          name: 'Event 1',
          description: 'Desc',
          logoAssetId: 'logo-1',
        }),
      };
      const dataSource = {
        query: jest.fn((sql: string) => {
          if (sql.includes('organization_memberships'))
            return Promise.resolve([{ id: 'event-1' }]);
          if (sql.includes('workspace_revision'))
            return Promise.resolve([{ workspaceRevision: 1 }]);
          return Promise.resolve([
            {
              primaryColor: '#1e4b8c',
              navigation: {},
              contact: {},
              footer: {},
              seo: {},
              navbarLogoSize: 40,
            },
          ]);
        }),
      };
      const eventsRepo = {
        createQueryBuilder: jest.fn(() => queryBuilder),
        findOne: jest.fn().mockResolvedValue({
          id: 'event-1',
          name: 'Event 1',
          description: 'Desc',
          logoAssetId: 'logo-1',
        }),
      };
      const service = new AdminService(
        {} as never,
        eventsRepo as never,
        dataSource as never,
        { get: jest.fn() } as unknown as ConfigService,
      );

      const result = await service.settings('event-1', 'user-1');

      expect(result.data).toMatchObject({
        logoAssetId: 'logo-1',
        logoUrl: '/api/v1/admin/events/event-1/media/logo-1',
        navbarLogoSize: 40,
      });
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('navbar_logo_size AS "navbarLogoSize"'),
        ['event-1'],
      );
    });

    it('writes logo asset id and navbar logo size on settings update', async () => {
      const queryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'event-1' }),
      };
      const manager = {
        query: jest
          .fn()
          .mockResolvedValueOnce([[{ workspaceRevision: 2 }], 1]) // claim revision
          .mockResolvedValueOnce([{ id: 'logo-1' }]) // owned asset check
          .mockResolvedValueOnce([]) // UPDATE event_sites
          .mockResolvedValueOnce([]) // INSERT site_settings
          .mockResolvedValueOnce([]), // audit_logs
      };
      const dataSource = {
        query: jest.fn((sql: string) => {
          if (sql.includes('workspace_revision'))
            return Promise.resolve([{ workspaceRevision: 2 }]);
          return Promise.resolve([
            {
              primaryColor: '#1e4b8c',
              navigation: {},
              contact: {},
              footer: {},
              seo: {},
              navbarLogoSize: 40,
            },
          ]);
        }),
        transaction: jest.fn((cb) => cb(manager)),
      };
      const eventsRepo = {
        createQueryBuilder: jest.fn(() => queryBuilder),
        findOne: jest.fn().mockResolvedValue({
          id: 'event-1',
          name: 'Event 1',
          description: 'Deskripsi',
          logoAssetId: 'logo-1',
        }),
      };
      const service = new AdminService(
        {} as never,
        eventsRepo as never,
        dataSource as never,
        { get: jest.fn() } as unknown as ConfigService,
      );

      await service.putSettings('event-1', 'user-1', {
        eventDescription: 'Deskripsi',
        primaryColor: '#1e4b8c',
        logoAssetId: 'logo-1',
        navbarLogoSize: 40,
        navigation: {},
        contact: {},
        footer: {},
        expectedRevision: 1,
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('SET description=$2,logo_asset_id=$3'),
        ['event-1', 'Deskripsi', 'logo-1'],
      );
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('navbar_logo_size'),
        expect.arrayContaining(['event-1', 40]),
      );
    });

    it('clears logo asset id when logoAssetId is null', async () => {
      const queryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'event-1' }),
      };
      const manager = {
        query: jest
          .fn()
          .mockResolvedValueOnce([[{ workspaceRevision: 2 }], 1])
          .mockResolvedValue([]),
      };
      const dataSource = {
        query: jest.fn((sql: string) => {
          if (sql.includes('organization_memberships'))
            return Promise.resolve([{ id: 'event-1' }]);
          if (sql.includes('workspace_revision'))
            return Promise.resolve([{ workspaceRevision: 1 }]);
          return Promise.resolve([]);
        }),
        transaction: jest.fn((cb) => cb(manager)),
      };
      const eventsRepo = {
        createQueryBuilder: jest.fn(() => queryBuilder),
        findOne: jest.fn().mockResolvedValue({
          id: 'event-1',
          name: 'Event 1',
          description: '',
          logoAssetId: null,
        }),
      };
      const service = new AdminService(
        {} as never,
        eventsRepo as never,
        dataSource as never,
        { get: jest.fn() } as unknown as ConfigService,
      );

      await service.putSettings('event-1', 'user-1', {
        primaryColor: '#1e4b8c',
        logoAssetId: null,
        navbarLogoSize: 36,
        navigation: {},
        contact: {},
        footer: {},
        expectedRevision: 1,
      });

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('SET description=$2,logo_asset_id=$3'),
        ['event-1', '', null],
      );
    });

    it('rejects invalid logo asset by validating ownership, active status, and mime type', async () => {
      const queryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'event-1' }),
      };
      const manager = {
        query: jest.fn().mockResolvedValue([]), // asset query returns empty array
      };
      const dataSource = {
        query: jest.fn((sql: string) => {
          if (sql.includes('organization_memberships'))
            return Promise.resolve([{ id: 'event-1' }]);
          if (sql.includes('workspace_revision'))
            return Promise.resolve([{ workspaceRevision: 1 }]);
          return Promise.resolve([]);
        }),
        transaction: jest.fn((cb) => cb(manager)),
      };
      const eventsRepo = {
        createQueryBuilder: jest.fn(() => queryBuilder),
      };
      const service = new AdminService(
        {} as never,
        eventsRepo as never,
        dataSource as never,
        { get: jest.fn() } as unknown as ConfigService,
      );

      await expect(
        service.putSettings('event-1', 'user-1', {
          primaryColor: '#1e4b8c',
          logoAssetId: 'invalid-logo-uuid',
          navbarLogoSize: 36,
          navigation: {},
          contact: {},
          footer: {},
        }),
      ).rejects.toThrow('Invalid logo asset');

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining("asset.status='active'"),
        [
          'invalid-logo-uuid',
          'event-1',
          ['image/png', 'image/jpeg', 'image/webp'],
        ],
      );
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('event.organization_id=asset.organization_id'),
        expect.anything(),
      );
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('asset.mime_type=ANY($3::text[])'),
        expect.anything(),
      );
    });
  });
});
