import { PATH_METADATA } from '@nestjs/common/constants';
import { MediaController } from './media.controller';

describe('MediaController event route', () => {
  it('uploads media under the Event endpoint', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, MediaController.prototype.upload),
    ).toBe('admin/events/:eventId/media');
  });
});
