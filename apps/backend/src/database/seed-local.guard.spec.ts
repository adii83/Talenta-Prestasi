import { assertLocalSeedAllowed } from './seed-local.guard';

describe('assertLocalSeedAllowed', () => {
  it('rejects production', () => {
    expect(() => assertLocalSeedAllowed('production')).toThrow(
      'seed:local requires NODE_ENV=development or NODE_ENV=test',
    );
  });

  it('allows development and test only', () => {
    expect(() => assertLocalSeedAllowed('development')).not.toThrow();
    expect(() => assertLocalSeedAllowed('test')).not.toThrow();
  });

  it('rejects missing or unknown environments', () => {
    expect(() => assertLocalSeedAllowed(undefined)).toThrow(
      'seed:local requires NODE_ENV=development or NODE_ENV=test',
    );
    expect(() => assertLocalSeedAllowed('Production')).toThrow(
      'seed:local requires NODE_ENV=development or NODE_ENV=test',
    );
  });
});
