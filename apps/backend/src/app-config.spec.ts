import { validateEnvironment } from './app-config';

const base = {
  NODE_ENV: 'development',
  DB_HOST: 'db.example.com',
  DB_PORT: '5432',
  DB_USERNAME: 'app',
  DB_PASSWORD: 'secret',
  DB_DATABASE: 'talenta',
  JWT_SECRET: 'a'.repeat(64),
};

describe('validateEnvironment', () => {
  it('accepts the required development configuration', () => {
    expect(validateEnvironment(base)).toEqual(base);
  });

  it('requires explicit public settings in production', () => {
    expect(() =>
      validateEnvironment({ ...base, NODE_ENV: 'production' }),
    ).toThrow('Missing required production environment variable: CORS_ORIGINS');
  });

  it('rejects wildcard CORS origins in production', () => {
    expect(() =>
      validateEnvironment({
        ...base,
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        CORS_ORIGINS: '*',
        PUBLIC_BASE_DOMAIN: 'example.com',
        JWT_EXPIRES_IN: '1h',
        LOCAL_STORAGE_PATH: '/srv/talenta/uploads',
      }),
    ).toThrow('CORS_ORIGINS must contain explicit HTTPS origins');
  });

  it('rejects CORS origins containing a path', () => {
    expect(() =>
      validateEnvironment({
        ...base,
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        CORS_ORIGINS: 'https://admin.example.com/path',
        PUBLIC_BASE_DOMAIN: 'example.com',
        JWT_EXPIRES_IN: '1h',
        LOCAL_STORAGE_PATH: '/srv/talenta/uploads',
      }),
    ).toThrow('CORS_ORIGINS must contain explicit HTTPS origins');
  });

  it('rejects wildcard and non-HTTPS production origins', () => {
    for (const origin of ['https://*.example.com', 'http://admin.example.com']) {
      expect(() =>
        validateEnvironment({
          ...base,
          NODE_ENV: 'production',
          HOST: '127.0.0.1',
          CORS_ORIGINS: origin,
          PUBLIC_BASE_DOMAIN: 'example.com',
          JWT_EXPIRES_IN: '1h',
          LOCAL_STORAGE_PATH: '/srv/talenta/uploads',
        }),
      ).toThrow('CORS_ORIGINS must contain explicit HTTPS origins');
    }
  });

  it('requires an explicit bind host in production', () => {
    expect(() =>
      validateEnvironment({
        ...base,
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://admin.example.com',
        PUBLIC_BASE_DOMAIN: 'example.com',
        JWT_EXPIRES_IN: '1h',
        LOCAL_STORAGE_PATH: '/srv/talenta/uploads',
      }),
    ).toThrow('Missing required production environment variable: HOST');
  });

  it('rejects a malformed public base domain', () => {
    expect(() =>
      validateEnvironment({
        ...base,
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        CORS_ORIGINS: 'https://admin.example.com',
        PUBLIC_BASE_DOMAIN: 'https://example.com',
        JWT_EXPIRES_IN: '1h',
        LOCAL_STORAGE_PATH: '/srv/talenta/uploads',
      }),
    ).toThrow('PUBLIC_BASE_DOMAIN must be a hostname');
  });

  it('requires an absolute production storage path', () => {
    expect(() =>
      validateEnvironment({
        ...base,
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        CORS_ORIGINS: 'https://admin.example.com',
        PUBLIC_BASE_DOMAIN: 'example.com',
        JWT_EXPIRES_IN: '1h',
        LOCAL_STORAGE_PATH: 'storage/uploads',
      }),
    ).toThrow('LOCAL_STORAGE_PATH must be absolute in production');
  });

  it('rejects placeholder and whitespace JWT secrets', () => {
    expect(() =>
      validateEnvironment({
        ...base,
        JWT_SECRET: 'CHANGE_WITH_AT_LEAST_32_RANDOM_CHARACTERS',
      }),
    ).toThrow('JWT_SECRET must be replaced with a random secret');
    expect(() =>
      validateEnvironment({ ...base, JWT_SECRET: ' '.repeat(64) }),
    ).toThrow('JWT_SECRET must contain at least 32 non-whitespace characters');
  });

  it('requires a recognized NODE_ENV', () => {
    expect(() => validateEnvironment({ ...base, NODE_ENV: 'Production' })).toThrow(
      'NODE_ENV must be development, test, or production',
    );
  });

  it('accepts complete production configuration', () => {
    const config = {
      ...base,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      CORS_ORIGINS: 'https://admin.example.com',
      PUBLIC_BASE_DOMAIN: 'example.com',
      JWT_EXPIRES_IN: '1h',
      LOCAL_STORAGE_PATH: '/srv/talenta/uploads',
    };
    expect(validateEnvironment(config)).toEqual(config);
  });
});
