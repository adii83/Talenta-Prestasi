import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ workspaceRevision: 1 }]),
    };
    const service = new AdminContentService(db as never);

    const result = await service.detailSettings('event-1', 'user-1');

    expect(result.data.settings).toMatchObject({
      archiveDisplayName: 'Nama Arsip Tanpa Tahun',
    });
    expect(db.query.mock.calls[1][0]).toContain(
      'archive_display_name AS "archiveDisplayName"',
    );
    expect(db.query.mock.calls[1][0]).toContain(
      'winners_description AS "winnersDescription"',
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
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ workspaceRevision: 1 }]),
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new AdminContentService(db as never);

    await service.putDetailSettings(
      'event-1',
      'user-1',
      {
        archiveDisplayName: '  Nama Arsip Tanpa Tahun  ',
        winnersEyebrow: '  Hasil Resmi  ',
        winnersTitle: '  Para Juara  ',
        winnersDescription: '  Ringkasan hasil Event  ',
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
    expect(upsert?.[0]).toContain('winners_eyebrow');
    expect(upsert?.[0]).toContain('winners_title');
    expect(upsert?.[0]).toContain('winners_description');
    expect(upsert?.[1]).toContain('Nama Arsip Tanpa Tahun');
    expect(upsert?.[1]).toContain('Hasil Resmi');
    expect(upsert?.[1]).toContain('Para Juara');
    expect(upsert?.[1]).toContain('Ringkasan hasil Event');
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
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ workspaceRevision: 1 }]),
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

  it('accepts a null archive display name while persisting document order', async () => {
    const manager = {
      query: jest.fn(async (sql: string, params?: unknown[]) =>
        sql.includes('SELECT id FROM event_documents')
          ? [{ id: params?.[0] }]
          : [],
      ),
    };
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'event-1' }])
        .mockResolvedValueOnce([{ id: 'event-1' }])
        .mockResolvedValueOnce([{ archiveDisplayName: null }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ workspaceRevision: 1 }]),
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new AdminContentService(db as never);

    await service.putDetailSettings('event-1', 'user-1', {
      archiveDisplayName: null,
      isActive: true,
      winnersActive: true,
      documentsActive: true,
      metadataVisibility: {},
      categories: [],
      documents: [
        { documentId: 'document-2', isVisible: true, labelOverride: '' },
        { documentId: 'document-1', isVisible: true, labelOverride: '' },
      ],
    } as never);

    const documentInserts = manager.query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO archive_document_settings'),
    );
    expect(documentInserts.map(([, params]) => params)).toEqual([
      ['event-1', 'document-2', true, '', 0],
      ['event-1', 'document-1', true, '', 1],
    ]);
  });

  it('rejects stale workspace revisions before mutating content', async () => {
    const manager = { query: jest.fn().mockResolvedValue([]) };
    const db = {
      query: jest.fn().mockResolvedValue([{ id: 'event-1' }]),
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new AdminContentService(db as never);

    await expect(
      service.createWinnerCategory('event-1', 'user-1', {
        name: 'Juara Umum',
        expectedRevision: 2,
      }),
    ).rejects.toThrow(
      'Data Event telah diperbarui pengguna lain. Muat ulang sebelum menyimpan.',
    );

    expect(
      manager.query.mock.calls.some(([sql]) =>
        sql.includes('INSERT INTO winner_categories'),
      ),
    ).toBe(false);
  });

  it('rejects stale detail settings before mutating workspace content', async () => {
    const manager = { query: jest.fn().mockResolvedValue([]) };
    const db = {
      query: jest.fn().mockResolvedValue([{ id: 'event-1' }]),
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new AdminContentService(db as never);

    await expect(
      service.putDetailSettings('event-1', 'user-1', {
        isActive: true,
        winnersActive: true,
        documentsActive: true,
        metadataVisibility: {},
        categories: [],
        documents: [],
        expectedRevision: 2,
      }),
    ).rejects.toThrow(
      'Data Event telah diperbarui pengguna lain. Muat ulang sebelum menyimpan.',
    );

    expect(
      manager.query.mock.calls.some(([sql]) =>
        sql.includes('INSERT INTO event_detail_settings'),
      ),
    ).toBe(false);
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

describe('AdminContentService winner decrees', () => {
  const eventId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';

  it('returns every winner decree in display order', async () => {
    const decrees = [
      { documentId: 'decree-1', title: 'SK Utama', defaultDownloadLabel: 'Unduh SK' },
      { documentId: 'decree-2', title: 'SK Nasional', defaultDownloadLabel: '' },
    ];
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ id: eventId }])
        .mockResolvedValueOnce(decrees)
        .mockResolvedValueOnce([{ workspaceRevision: 4 }]),
    };
    const service = new AdminContentService(db as never);

    const result = await service.decree(eventId, userId);

    expect(result.data.decrees).toEqual(decrees);
    expect(db.query.mock.calls[1][0]).toContain("document_role='winner_decree'");
    expect(db.query.mock.calls[1][0]).toContain('ORDER BY document.sort_order,document.id');
  });

  it('includes the default Banner label in document CRUD', async () => {
    const manager = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('COUNT(*)')) return [{ count: 0 }];
        if (sql.includes('INSERT INTO event_documents')) return [{ id: 'decree-1' }];
        return [];
      }),
    };
    const db = {
      query: jest.fn().mockResolvedValue([{ id: eventId }]),
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new AdminContentService(db as never);

    await service.createDocument(eventId, userId, {
      title: 'SK Utama',
      documentRole: 'winner_decree',
      defaultDownloadLabel: 'Unduh SK Utama',
    } as never);

    const insert = manager.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO event_documents'),
    );
    expect(insert?.[0]).toContain('default_download_label');
    expect(insert?.[1]).toContain('Unduh SK Utama');
  });

  it('rejects an eleventh winner decree', async () => {
    const manager = {
      query: jest.fn(async (sql: string) =>
        sql.includes('COUNT(*)') ? [{ count: '10' }] : [],
      ),
    };
    const db = {
      query: jest.fn().mockResolvedValue([{ id: eventId }]),
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new AdminContentService(db as never);

    await expect(
      service.createDocument(eventId, userId, {
        title: 'SK Kesebelas',
        documentRole: 'winner_decree',
      }),
    ).rejects.toThrow('Maksimal 10 SK Pemenang per Event');
  });
});

describe('AdminContentService winner modes', () => {
  const eventId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const categoryId = '33333333-3333-4333-8333-333333333333';
  const designAssetId = '44444444-4444-4444-8444-444444444444';

  function serviceWithManager(
    query: (sql: string, params?: unknown[]) => Promise<unknown[]>,
  ) {
    const manager = { query: jest.fn(query) };
    const db = {
      query: jest.fn().mockResolvedValue([{ id: eventId }]),
      transaction: jest.fn((callback) => callback(manager)),
    };
    return {
      manager,
      service: new AdminContentService(db as never),
    };
  }

  it('lists winner mode, design, district, and built-in photo fields', async () => {
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ id: eventId }])
        .mockResolvedValueOnce([]),
    };
    const service = new AdminContentService(db as never);

    await service.list('winners', eventId, userId);

    const sql = db.query.mock.calls[1][0];
    expect(sql).toContain('display_mode AS "displayMode"');
    expect(sql).toContain('design_asset_id AS "designAssetId"');
    expect(sql).toContain('district');
    expect(sql).toContain('photo_asset_id AS "photoAssetId"');
  });

  it('creates a custom winner and clears all built-in fields', async () => {
    const { manager, service } = serviceWithManager(async (sql) => {
      if (sql.includes('FROM winner_categories')) return [{ id: categoryId }];
      if (sql.includes('FROM media_assets asset'))
        return [
          {
            mimeType: 'image/webp',
            byteSize: '2097152',
            status: 'active',
          },
        ];
      if (sql.includes('INSERT INTO winners'))
        return [
          {
            id: 'winner-1',
            categoryId,
            displayMode: 'custom',
            designAssetId,
            fullName: null,
          },
        ];
      return [];
    });

    const result = await service.createWinner(eventId, userId, {
      categoryId,
      displayMode: 'custom',
      designAssetId,
      fullName: 'harus dibersihkan',
      school: 'harus dibersihkan',
      photoAssetId: designAssetId,
      rankLabel: 'Juara 1',
    });

    const insert = manager.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO winners'),
    );
    expect(insert?.[1]).toEqual([
      eventId,
      categoryId,
      null,
      'Juara 1',
      null,
      null,
      null,
      null,
      null,
      null,
      designAssetId,
      'custom',
      true,
      0,
    ]);
    expect(result.data).toMatchObject({
      displayMode: 'custom',
      designAssetId,
      fullName: null,
    });
  });

  it.each([
    ['inactive', 'image/png', '1', 'Design asset must be active'],
    ['active', 'image/svg+xml', '1', 'Design must be JPG, PNG, or WebP'],
    ['active', 'image/png', '2097153', 'Design file must not exceed 2 MB'],
  ])(
    'rejects invalid custom asset: %s %s %s',
    async (status, mimeType, byteSize, message) => {
      const { service } = serviceWithManager(async (sql) => {
        if (sql.includes('FROM winner_categories')) return [{ id: categoryId }];
        if (sql.includes('FROM media_assets asset'))
          return [{ status, mimeType, byteSize }];
        return [];
      });

      await expect(
        service.createWinner(eventId, userId, {
          categoryId,
          displayMode: 'custom',
          designAssetId,
        }),
      ).rejects.toThrow(message);
    },
  );

  it('rejects a custom asset outside the Event organization', async () => {
    const { service } = serviceWithManager(async (sql) => {
      if (sql.includes('FROM winner_categories')) return [{ id: categoryId }];
      if (sql.includes('FROM media_assets asset')) return [];
      return [];
    });

    await expect(
      service.createWinner(eventId, userId, {
        categoryId,
        displayMode: 'custom',
        designAssetId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('merges a partial PATCH and atomically clears built-in fields on mode switch', async () => {
    const existing = {
      id: 'winner-1',
      categoryId,
      displayMode: 'built_in',
      designAssetId: null,
      fullName: 'Nama Lama',
      rankLabel: 'Juara 1',
      school: 'Sekolah Lama',
      examNumber: 'A-1',
      district: 'Kabupaten Lama',
      regency: 'Kabupaten Lama',
      province: 'Provinsi Lama',
      photoAssetId: designAssetId,
      isActive: true,
      sortOrder: 0,
    };
    const { manager, service } = serviceWithManager(async (sql) => {
      if (sql.includes('FROM winners') && sql.includes('FOR UPDATE'))
        return [existing];
      if (sql.includes('FROM winner_categories')) return [{ id: categoryId }];
      if (sql.includes('FROM media_assets asset'))
        return [
          { status: 'active', mimeType: 'image/png', byteSize: '1000' },
        ];
      if (sql.includes('UPDATE winners'))
        return [
          {
            ...existing,
            displayMode: 'custom',
            designAssetId,
            fullName: null,
          },
        ];
      return [];
    });

    await service.updateWinner(eventId, 'winner-1', userId, {
      displayMode: 'custom',
      designAssetId,
    });

    const update = manager.query.mock.calls.find(([sql]) =>
      sql.includes('UPDATE winners'),
    );
    expect(update?.[1]).toEqual([
      'winner-1',
      eventId,
      categoryId,
      null,
      'Juara 1',
      null,
      null,
      null,
      null,
      null,
      null,
      designAssetId,
      'custom',
      true,
      0,
    ]);
    expect(update?.[0]).not.toContain('display_mode=$3');
  });

  it('requires a non-empty name in built-in final state', async () => {
    const { service } = serviceWithManager(async (sql) => {
      if (sql.includes('FROM winner_categories')) return [{ id: categoryId }];
      return [];
    });

    await expect(
      service.createWinner(eventId, userId, {
        categoryId,
        displayMode: 'built_in',
        fullName: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('compacts every ordinal after delete and preserves custom rank labels', async () => {
    const winnerRows = [
      {
        id: 'winner-1',
        categoryId,
        rankPrefix: 'Juara',
        rankLabel: 'Juara 1',
        sortOrder: 0,
        isActive: true,
      },
      {
        id: 'winner-2',
        categoryId,
        rankPrefix: 'Juara',
        rankLabel: 'Juara 2',
        sortOrder: 1,
        isActive: false,
      },
      {
        id: 'winner-3',
        categoryId,
        rankPrefix: 'Juara',
        rankLabel: 'Juara 3',
        sortOrder: 2,
        isActive: true,
      },
      {
        id: 'winner-4',
        categoryId,
        rankPrefix: 'Juara',
        rankLabel: 'Medali Emas',
        sortOrder: 3,
        isActive: true,
      },
    ];
    const { manager, service } = serviceWithManager(async (sql) => {
      if (sql.includes('FOR UPDATE OF winner')) return winnerRows;
      if (sql.includes('DELETE FROM winners')) return [{ id: 'winner-2' }];
      if (sql.includes('UPDATE winners')) return [{ id: 'updated' }];
      return [];
    });

    await service.deleteWinner(eventId, 'winner-2', userId);

    const updates = manager.query.mock.calls.filter(([sql]) =>
      sql.includes('UPDATE winners'),
    );
    expect(updates.map((call) => call[1])).toEqual([
      ['winner-1', eventId, 0, 'Juara 1'],
      ['winner-3', eventId, 1, 'Juara 2'],
      ['winner-4', eventId, 2, 'Medali Emas'],
    ]);
  });
});
