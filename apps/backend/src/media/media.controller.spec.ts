import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediaController } from './media.controller';

describe('MediaController event route', () => {
  it('uploads media under the Event endpoint', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, MediaController.prototype.upload),
    ).toBe('admin/events/:eventId/media');
  });

  it('serves admin preview media under event route with JwtAuthGuard', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, MediaController.prototype.adminFile),
    ).toBe('admin/events/:eventId/media/:assetId');

    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      MediaController.prototype.adminFile,
    );
    expect(guards).toContain(JwtAuthGuard);
  });
});
