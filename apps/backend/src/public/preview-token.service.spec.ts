import { PreviewTokenService } from './preview-token.service';

describe('PreviewTokenService', () => {
  const claims = {
    purpose: 'event-preview' as const,
    sub: '11111111-1111-4111-8111-111111111111',
    organizationId: '22222222-2222-4222-8222-222222222222',
    categoryId: '33333333-3333-4333-8333-333333333333',
    eventId: '44444444-4444-4444-8444-444444444444',
  };

  it('issues a 15-minute token with a dedicated audience', async () => {
    const jwt = {
      signAsync: jest.fn().mockResolvedValue('preview-token'),
      verifyAsync: jest.fn().mockResolvedValue(claims),
      decode: jest.fn().mockReturnValue({ exp: 2_000_000_000 }),
    };
    const service = new PreviewTokenService(jwt as never);

    const issued = await service.issue(claims);

    expect(jwt.signAsync).toHaveBeenCalledWith(claims, {
      audience: 'event-preview',
      expiresIn: '15m',
    });
    expect(issued).toEqual({
      token: 'preview-token',
      expiresAt: new Date(2_000_000_000_000).toISOString(),
    });
  });

  it('creates a path-scoped HttpOnly cookie with optional Secure', () => {
    const service = new PreviewTokenService({} as never);

    expect(service.cookie('preview-token', false)).toBe(
      'talenta_preview=preview-token; Path=/api/v1/public; Max-Age=900; HttpOnly; SameSite=Lax',
    );
    expect(service.cookie('preview-token', true)).toMatch(/; Secure$/);
  });

  it('rejects tokens without the preview purpose', async () => {
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({ ...claims, purpose: 'login' }),
    };
    const service = new PreviewTokenService(jwt as never);

    await expect(service.verify('admin-token')).rejects.toThrow(
      'Invalid or expired preview token',
    );
  });
});
