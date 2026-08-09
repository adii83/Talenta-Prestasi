import { PublicService } from './public.service';

describe('PublicService automatic archives', () => {
  it('returns every non-active event in the same category', async () => {
    const db = {
      query: jest.fn().mockResolvedValue([]),
    };
    const service = new PublicService(db as never);

    await (
      service as unknown as {
        archiveEvents: (
          categoryId: string,
          activeEventId: string,
        ) => Promise<unknown>;
      }
    ).archiveEvents(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    );

    const sql = db.query.mock.calls[0][0] as string;
    expect(sql).toContain('event.is_active=false');
    expect(sql).not.toContain('EXISTS (');
  });

  it('only resolves active events for public pages', async () => {
    const db = { query: jest.fn().mockResolvedValue([]) };
    const service = new PublicService(db as never);

    await expect(service.home('octal')).rejects.toThrow(
      'Published site not found',
    );

    expect(db.query.mock.calls[0][0]).toContain("event.status='active'");
  });
});
