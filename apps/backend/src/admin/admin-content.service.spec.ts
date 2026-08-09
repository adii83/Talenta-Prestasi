import { ForbiddenException } from '@nestjs/common';
import { AdminContentService } from './admin-content.service';

describe('AdminContentService event access', () => {
  it('rejects content writes from read-only memberships', async () => {
    const db = {
      query: jest.fn().mockResolvedValue([]),
    };
    const service = new AdminContentService(db as never);

    await expect(
      service.createWinnerCategory(
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        { name: 'Juara Umum' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(db.query.mock.calls[0][0]).toContain(
      "membership.role IN ('owner','admin','editor')",
    );
  });
});
