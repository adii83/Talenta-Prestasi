import { databaseConnectionOptions } from './database-options';

describe('databaseConnectionOptions', () => {
  const base = {
    DB_HOST: 'db.example.com',
    DB_PORT: '6432',
    DB_USERNAME: 'app',
    DB_PASSWORD: 'secret',
    DB_DATABASE: 'talenta',
  };

  it('disables startup migrations and SSL by default', () => {
    expect(databaseConnectionOptions(base)).toMatchObject({
      host: 'db.example.com',
      port: 6432,
      migrationsRun: false,
      ssl: false,
    });
  });

  it('enables verified TLS', () => {
    expect(
      databaseConnectionOptions({
        ...base,
        DB_SSL: 'true',
      }),
    ).toMatchObject({
      ssl: { rejectUnauthorized: true },
    });
  });

  it('only enables startup migrations explicitly', () => {
    expect(
      databaseConnectionOptions({ ...base, DB_MIGRATIONS_RUN: 'true' }),
    ).toMatchObject({ migrationsRun: true });
    expect(
      databaseConnectionOptions(
        { ...base, DB_MIGRATIONS_RUN: 'true' },
        false,
      ),
    ).toMatchObject({ migrationsRun: false });
  });
});
