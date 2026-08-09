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
});
