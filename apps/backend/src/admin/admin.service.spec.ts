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
      { name: 'Octal 2027', description: 'Periode baru' },
    );

    expect(manager.query.mock.calls[1][0]).not.toContain('slug=');
    expect(result.data.slug).toBe('2026');
  });
});
