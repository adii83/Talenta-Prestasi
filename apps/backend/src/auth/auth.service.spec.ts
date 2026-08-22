import { UnauthorizedException } from '@nestjs/common';
import { hash } from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';

const activeUser = async (): Promise<User> =>
  ({
    id: 'user-1',
    username: 'admin',
    passwordHash: await hash('StrongPassword123!', 4),
    status: 'active',
    lastLoginAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    memberships: [],
  }) as User;

describe('AuthService', () => {
  let user: User;
  const users = {
    findOne: jest.fn(),
    save: jest.fn((user: User) => Promise.resolve(user)),
  };
  const jwt = { sign: jest.fn(() => 'signed-token') };
  const service = new AuthService(users as never, jwt as never);

  beforeEach(async () => {
    jest.clearAllMocks();
    user = await activeUser();
  });

  it('normalizes username before lookup and returns username identity', async () => {
    users.findOne.mockResolvedValue(user);

    const result = await service.login('  AdMiN  ', 'StrongPassword123!');

    expect(users.findOne).toHaveBeenCalledWith({ where: { username: 'admin' } });
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 'user-1', username: 'admin' });
    expect(result.user).toEqual({ id: 'user-1', username: 'admin' });
  });

  it('rejects a missing user with a generic message', async () => {
    users.findOne.mockResolvedValue(null);

    await expect(
      service.login('admin', 'StrongPassword123!'),
    ).rejects.toEqual(new UnauthorizedException('Kredensial tidak valid'));
  });

  it('rejects a suspended user with a generic message', async () => {
    users.findOne.mockResolvedValue({ ...user, status: 'suspended' });

    await expect(
      service.login('admin', 'StrongPassword123!'),
    ).rejects.toEqual(new UnauthorizedException('Kredensial tidak valid'));
  });

  it('rejects a wrong password with a generic message', async () => {
    users.findOne.mockResolvedValue(user);

    await expect(service.login('admin', 'WrongPassword123!')).rejects.toEqual(
      new UnauthorizedException('Kredensial tidak valid'),
    );
  });
});
