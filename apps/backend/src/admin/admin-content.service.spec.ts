import { ForbiddenException } from '@nestjs/common';
import { AdminContentService } from './admin-content.service';

describe('AdminContentService event access', () => {
  it('returns the archive display name with Detail Arsip settings', async () => {
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'event-1' }])
        .mockResolvedValueOnce([
          { archiveDisplayName: 'Nama Arsip Tanpa Tahun' },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
    };
    const service = new AdminContentService(db as never);

    const result = await service.detailSettings('event-1', 'user-1');

    expect(result.data.settings).toMatchObject({
      archiveDisplayName: 'Nama Arsip Tanpa Tahun',
    });
    expect(db.query.mock.calls[1][0]).toContain(
      'archive_display_name AS "archiveDisplayName"',
    );
  });

  it('persists an archive display name without updating canonical Event name', async () => {
    const manager = { query: jest.fn().mockResolvedValue([]) };
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'event-1' }])
        .mockResolvedValueOnce([{ id: 'event-1' }])
        .mockResolvedValueOnce([
          { archiveDisplayName: 'Nama Arsip Tanpa Tahun' },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new AdminContentService(db as never);

    await service.putDetailSettings(
      'event-1',
      'user-1',
      {
        archiveDisplayName: '  Nama Arsip Tanpa Tahun  ',
        isActive: true,
        winnersActive: true,
        documentsActive: true,
        metadataVisibility: {},
        categories: [],
        documents: [],
      } as never,
    );

    const upsert = manager.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO event_detail_settings'),
    );
    expect(upsert?.[0]).toContain('archive_display_name');
    expect(upsert?.[1]).toContain('Nama Arsip Tanpa Tahun');
    expect(
      manager.query.mock.calls.some(([sql]) =>
        sql.includes('UPDATE event_sites SET name='),
      ),
    ).toBe(false);
  });

  it('rejects an archive display name that becomes empty after trimming', async () => {
    const db = {
      query: jest.fn().mockResolvedValue([{ id: 'event-1' }]),
      transaction: jest.fn(),
    };
    const service = new AdminContentService(db as never);

    await expect(
      service.putDetailSettings('event-1', 'user-1', {
        archiveDisplayName: '   ',
        isActive: true,
        winnersActive: true,
        documentsActive: true,
        metadataVisibility: {},
        categories: [],
        documents: [],
      }),
    ).rejects.toThrow('Archive display name is required');

    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('preserves an existing archive display name when an older client omits it', async () => {
    const manager = { query: jest.fn().mockResolvedValue([]) };
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'event-1' }])
        .mockResolvedValueOnce([{ id: 'event-1' }])
        .mockResolvedValueOnce([
          { archiveDisplayName: 'Nama Existing' },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new AdminContentService(db as never);

    await service.putDetailSettings('event-1', 'user-1', {
      isActive: true,
      winnersActive: true,
      documentsActive: true,
      metadataVisibility: {},
      categories: [],
      documents: [],
    });

    const upsert = manager.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO event_detail_settings'),
    );
    expect(upsert?.[0]).toContain(
      'ELSE event_detail_settings.archive_display_name END',
    );
  });

  it('rejects content writes from read-only memberships', async () => {
    const db = {
      query: jest.fn().mockResolvedValue([]),
    };
    const service = new AdminContentService(db as never);

    await expect(
      service.createWinnerCategory(
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        { name: 'Juara Umum' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(db.query.mock.calls[0][0]).toContain(
      "membership.role IN ('owner','admin','editor')",
    );
  });
});
