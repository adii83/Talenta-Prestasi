import {
  collectAssetIds,
  EventPublicationService,
} from './event-publication.service';

describe('EventPublicationService', () => {
  it('collects direct and URL-based media references', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    expect(
      collectAssetIds({
        logoAssetId: id,
        hero: { image: `/api/v1/public/media/${id}` },
      }),
    ).toEqual([id]);
  });

  it('collects custom winner design assets for publication', () => {
    const designId = '22222222-2222-4222-8222-222222222222';
    expect(
      collectAssetIds({
        winners: {
          categories: [
            {
              winners: [
                { displayMode: 'built_in', designAssetId: null },
                { displayMode: 'custom', designAssetId: designId },
              ],
            },
          ],
        },
      }),
    ).toContain(designId);
  });

  it('captures publication snapshots sequentially on one transaction', async () => {
    let building = false;
    const manager = {
      query: jest.fn((sql: string) => {
        if (sql.includes('FROM event_sites event'))
          return Promise.resolve([
            {
              id: 'event-1',
              categoryId: 'category-1',
              organizationId: 'organization-1',
              version: 1,
              role: 'editor',
            },
          ]);
        if (sql.includes('INSERT INTO event_publications'))
          return Promise.resolve([{ version: 1 }]);
        return Promise.resolve([]);
      }),
    };
    const service = new EventPublicationService(
      {
        transaction: jest.fn((_isolation, callback) => callback(manager)),
      } as never,
      {
        build: jest.fn(async () => {
          building = true;
          await new Promise((resolve) => setImmediate(resolve));
          building = false;
          return { schemaVersion: 1, bootstrap: { site: {} } };
        }),
      } as never,
      {
        capture: jest.fn(async () => {
          if (building) throw new Error('snapshot overlap');
          return {
            schemaVersion: 1,
            eventId: 'event-1',
            rows: { event_sites: [{ id: 'event-1' }] },
          };
        }),
      } as never,
      { issue: jest.fn() } as never,
    );

    await expect(service.publish('event-1', 'user-1')).resolves.toBeDefined();
  });

  it('publishes public and workspace snapshots in one transaction', async () => {
    const manager = {
      query: jest.fn((sql: string) => {
        if (sql.includes('FROM event_sites event'))
          return Promise.resolve([
            {
              id: 'event-1',
              categoryId: 'category-1',
              organizationId: 'organization-1',
              version: 3,
              role: 'editor',
            },
          ]);
        if (sql.includes('INSERT INTO event_publications'))
          return Promise.resolve([{ version: 1 }]);
        return Promise.resolve([]);
      }),
    };
    const db = {
      transaction: jest.fn((_isolation, callback) => callback(manager)),
    };
    const logoId = '11111111-1111-4111-8111-111111111111';
    const publicSnapshot = {
      schemaVersion: 1,
      bootstrap: {
        site: {
          logoAssetId: logoId,
        },
      },
    };
    const workspaceSnapshot = {
      schemaVersion: 1 as const,
      eventId: 'event-1',
      rows: { event_sites: [{ id: 'event-1' }] },
    };
    const service = new EventPublicationService(
      db as never,
      { build: jest.fn().mockResolvedValue(publicSnapshot) } as never,
      { capture: jest.fn().mockResolvedValue(workspaceSnapshot) } as never,
      { issue: jest.fn() } as never,
    );

    const result = await service.publish('event-1', 'user-1', 3);

    expect(db.transaction).toHaveBeenCalledWith(
      'REPEATABLE READ',
      expect.any(Function),
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO event_publications'),
      expect.arrayContaining(['event-1', 'organization-1', 'category-1']),
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO event_publication_assets'),
      ['event-1', [logoId], 'organization-1'],
    );
    expect(result.data.publicationState).toBe('published');
  });

  it('refreshes a published archive snapshot when its identity changes', async () => {
    const archiveAssetId = '22222222-2222-4222-8222-222222222222';
    const manager = {
      query: jest.fn((sql: string) => {
        if (sql.includes('FROM event_sites event'))
          return Promise.resolve([
            {
              id: 'event-active',
              categoryId: 'category-1',
              organizationId: 'organization-1',
              version: 3,
              role: 'editor',
            },
          ]);
        if (sql.includes('INSERT INTO event_publications'))
          return Promise.resolve([{ version: 2 }]);
        if (sql.includes('SELECT archive.id'))
          return Promise.resolve([{ id: 'event-archive' }]);
        return Promise.resolve([]);
      }),
    };
    const db = {
      transaction: jest.fn((_isolation, callback) => callback(manager)),
    };
    const activeSnapshot = {
      schemaVersion: 1,
      bootstrap: { site: {} },
    };
    const archiveSnapshot = {
      schemaVersion: 1,
      archiveDetail: {
        event: { mascotAssetId: archiveAssetId, fallbackIcon: 'star' },
      },
    };
    const content = {
      build: jest.fn((eventId: string) =>
        Promise.resolve(
          eventId === 'event-archive' ? archiveSnapshot : activeSnapshot,
        ),
      ),
    };
    const service = new EventPublicationService(
      db as never,
      content as never,
      {
        capture: jest.fn().mockResolvedValue({
          schemaVersion: 1,
          eventId: 'event-active',
          rows: { event_sites: [{ id: 'event-active' }] },
        }),
      } as never,
      { issue: jest.fn() } as never,
    );

    await service.publish('event-active', 'user-1', 3);

    expect(content.build).toHaveBeenCalledWith('event-archive', manager);
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE event_publications'),
      expect.arrayContaining(['event-archive', archiveSnapshot]),
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO event_publication_assets'),
      ['event-archive', [archiveAssetId], 'organization-1'],
    );
  });

  it('does not write a snapshot when the builder fails', async () => {
    const manager = {
      query: jest.fn((sql: string) => {
        if (sql.includes('FROM event_sites event'))
          return Promise.resolve([
            {
              id: 'event-1',
              categoryId: 'category-1',
              organizationId: 'organization-1',
              version: 1,
              role: 'editor',
            },
          ]);
        return Promise.resolve([]);
      }),
    };
    const db = {
      transaction: jest.fn((_isolation, callback) => callback(manager)),
    };
    const service = new EventPublicationService(
      db as never,
      {
        build: jest.fn().mockRejectedValue(new Error('invalid aggregate')),
      } as never,
      { capture: jest.fn() } as never,
      { issue: jest.fn() } as never,
    );

    await expect(service.publish('event-1', 'user-1')).rejects.toThrow(
      'invalid aggregate',
    );
    expect(manager.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO event_publications'),
      expect.anything(),
    );
  });
});
