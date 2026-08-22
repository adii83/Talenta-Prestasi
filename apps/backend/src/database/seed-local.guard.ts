export function assertLocalSeedAllowed(nodeEnvironment: string | undefined) {
  if (!['development', 'test'].includes(nodeEnvironment ?? '')) {
    throw new Error(
      'seed:local requires NODE_ENV=development or NODE_ENV=test',
    );
  }
}
