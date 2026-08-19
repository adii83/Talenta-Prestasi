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
        {} as never,
        { get: jest.fn() } as unknown as ConfigService,
      );

      const result = await service.event('event-1', 'user-1');

      expect(result.data).toMatchObject({
        fallbackIcon: 'star',
        mascotAssetId: 'asset-1',
      });
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
          .mockResolvedValueOnce([{ id: 'logo-1' }]) // owned asset check
          .mockResolvedValueOnce([]) // UPDATE event_sites
          .mockResolvedValueOnce([]) // INSERT site_settings
          .mockResolvedValueOnce([]), // audit_logs
      };
      const dataSource = {
        query: jest.fn().mockResolvedValue([
          {
            primaryColor: '#1e4b8c',
            navigation: {},
            contact: {},
            footer: {},
            seo: {},
            navbarLogoSize: 40,
          },
        ]),
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
        query: jest.fn().mockResolvedValue([]),
      };
      const dataSource = {
        query: jest.fn((sql: string) => {
          if (sql.includes('organization_memberships'))
            return Promise.resolve([{ id: 'event-1' }]);
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
