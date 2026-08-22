import { readFileSync } from 'node:fs';
import type { DataSourceOptions } from 'typeorm';

type Environment = Record<string, string | undefined>;
type DatabaseConnectionOptions = Pick<
  Extract<DataSourceOptions, { type: 'postgres' }>,
  | 'type'
  | 'host'
  | 'port'
  | 'username'
  | 'password'
  | 'database'
  | 'ssl'
  | 'migrationsRun'
>;

export function databaseConnectionOptions(
  environment: Environment,
  allowStartupMigrations = true,
): DatabaseConnectionOptions {
  const sslEnabled = environment.DB_SSL === 'true';
  const caPath = environment.DB_SSL_CA_PATH?.trim();

  return {
    type: 'postgres',
    host: environment.DB_HOST ?? 'localhost',
    port: Number(environment.DB_PORT ?? 5432),
    username: environment.DB_USERNAME ?? 'postgres',
    password: environment.DB_PASSWORD ?? 'postgres',
    database: environment.DB_DATABASE ?? 'talenta_prestasi',
    ssl: sslEnabled
      ? {
          rejectUnauthorized: true,
          ...(caPath ? { ca: readFileSync(caPath, 'utf8') } : {}),
        }
      : false,
    migrationsRun:
      allowStartupMigrations && environment.DB_MIGRATIONS_RUN === 'true',
  };
}
