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
    const publicSnapshot = { schemaVersion: 1, bootstrap: {} };
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

    expect(db.transaction).toHaveBeenCalledWith('REPEATABLE READ', expect.any(Function));
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO event_publications'),
      expect.arrayContaining(['event-1', 'organization-1', 'category-1']),
    );
    expect(result.data.publicationState).toBe('published');
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
      { build: jest.fn().mockRejectedValue(new Error('invalid aggregate')) } as never,
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
