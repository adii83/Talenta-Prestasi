import { isAbsolute } from 'node:path';

type Environment = Record<string, unknown>;

const REQUIRED = [
  'NODE_ENV',
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
  'JWT_SECRET',
] as const;
const REQUIRED_PRODUCTION = [
  'CORS_ORIGINS',
  'HOST',
  'PUBLIC_BASE_DOMAIN',
  'JWT_EXPIRES_IN',
  'LOCAL_STORAGE_PATH',
] as const;

export function validateEnvironment(config: Environment): Environment {
  for (const key of REQUIRED) {
    if (!config[key])
      throw new Error(`Missing required environment variable: ${key}`);
  }
  if (!['development', 'test', 'production'].includes(String(config.NODE_ENV))) {
    throw new Error('NODE_ENV must be development, test, or production');
  }
  const jwtSecret = String(config.JWT_SECRET).trim();
  if (jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET must contain at least 32 non-whitespace characters',
    );
  }
  if (jwtSecret.startsWith('CHANGE_')) {
    throw new Error('JWT_SECRET must be replaced with a random secret');
  }
  if (config.NODE_ENV === 'production') {
    for (const key of REQUIRED_PRODUCTION) {
      if (!config[key])
        throw new Error(
          `Missing required production environment variable: ${key}`,
        );
    }
    const publicBaseDomain = String(config.PUBLIC_BASE_DOMAIN);
    if (
      !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(
        publicBaseDomain,
      )
    ) {
      throw new Error('PUBLIC_BASE_DOMAIN must be a hostname');
    }
    if (!isAbsolute(String(config.LOCAL_STORAGE_PATH))) {
      throw new Error('LOCAL_STORAGE_PATH must be absolute in production');
    }
    const origins = String(config.CORS_ORIGINS)
      .split(',')
      .map((origin) => origin.trim());
    if (
      origins.some((origin) => {
        try {
          const url = new URL(origin);
          return (
            url.protocol !== 'https:' ||
            url.origin !== origin ||
            url.hostname.includes('*') ||
            url.username !== '' ||
            url.password !== ''
          );
        } catch {
          return true;
        }
      })
    ) {
      throw new Error('CORS_ORIGINS must contain explicit HTTPS origins');
    }
  }
  return config;
}
