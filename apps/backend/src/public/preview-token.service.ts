import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface PreviewClaims {
  purpose: 'event-preview';
  sub: string;
  organizationId: string;
  categoryId: string;
  eventId: string;
}

@Injectable()
export class PreviewTokenService {
  static readonly audience = 'event-preview';
  static readonly cookieName = 'talenta_preview';
  static readonly lifetimeSeconds = 900;

  constructor(private readonly jwt: JwtService) {}

  async issue(claims: PreviewClaims) {
    const token = await this.jwt.signAsync(claims, {
      audience: PreviewTokenService.audience,
      expiresIn: '15m',
    });
    const decoded = this.jwt.decode(token) as { exp?: number } | null;
    const expiresAt = new Date(
      (decoded?.exp ?? Math.floor(Date.now() / 1000) + 900) * 1000,
    ).toISOString();
    return { token, expiresAt };
  }

  async verify(token: string): Promise<PreviewClaims> {
    try {
      const claims = await this.jwt.verifyAsync<PreviewClaims>(token, {
        audience: PreviewTokenService.audience,
      });
      if (claims.purpose !== 'event-preview' || !claims.eventId)
        throw new Error('Wrong token purpose');
      return claims;
    } catch {
      throw new UnauthorizedException('Invalid or expired preview token');
    }
  }

  cookie(token: string, secure: boolean) {
    return `${PreviewTokenService.cookieName}=${encodeURIComponent(token)}; Path=/api/v1/public; Max-Age=${PreviewTokenService.lifetimeSeconds}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
  }

  fromCookie(header = '') {
    for (const pair of header.split(';')) {
      const [name, ...value] = pair.trim().split('=');
      if (name === PreviewTokenService.cookieName)
        return decodeURIComponent(value.join('='));
    }
    return '';
  }
}
