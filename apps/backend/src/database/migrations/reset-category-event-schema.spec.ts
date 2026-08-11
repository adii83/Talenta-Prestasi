import { AddEventDraftPublications1786586400000 } from './1786586400000-AddEventDraftPublications';
import { ResetCategoryEventSchema1786500000000 } from './1786500000000-ResetCategoryEventSchema';

describe('ResetCategoryEventSchema migration', () => {
  it('does not drop the public schema that contains the TypeORM migration ledger', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn((sql: string) => {
        queries.push(sql.trim());
        return Promise.resolve();
      }),
    };

    await new ResetCategoryEventSchema1786500000000().up(runner as never);

    expect(queries).not.toContain('DROP SCHEMA public CASCADE');
  });

  it('keeps the TypeORM migration ledger available during rollback', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn((sql: string) => {
        queries.push(sql.trim());
        return Promise.resolve();
      }),
    };

    await new ResetCategoryEventSchema1786500000000().down(runner as never);

    expect(queries).not.toContain('DROP SCHEMA public CASCADE');
  });

  it('adds Event publication snapshots without resetting existing content', async () => {
    const queries: string[] = [];
    const runner = {
      query: jest.fn((sql: string) => {
        queries.push(sql.trim());
        return Promise.resolve();
      }),
    };

    await new AddEventDraftPublications1786586400000().up(runner as never);

    const source = queries.join('\n');
    expect(source).toContain('CREATE TABLE event_publications');
    expect(source).toContain('public_snapshot jsonb');
    expect(source).toContain('workspace_snapshot jsonb');
    expect(source).toContain('CREATE TABLE event_publication_assets');
    expect(source).not.toContain('DROP TABLE competition_categories');
  });
});
