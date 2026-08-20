import { ConflictException } from '@nestjs/common';
import {
  claimWorkspaceRevision,
  readWorkspaceRevision,
  WORKSPACE_CONFLICT_MESSAGE,
  WorkspaceRevisionExecutor,
  WorkspaceRevisionRow,
} from './workspace-revision';

describe('workspace-revision', () => {
  let query: jest.MockedFunction<WorkspaceRevisionExecutor['query']>;
  let mockDb: WorkspaceRevisionExecutor;

  beforeEach(() => {
    query = jest.fn<WorkspaceRevisionExecutor['query']>();
    mockDb = { query };
  });

  describe('claimWorkspaceRevision', () => {
    it('returns new revision on success', async () => {
      query.mockResolvedValueOnce([{ workspaceRevision: 13 }]);

      await expect(claimWorkspaceRevision(mockDb, 'event-1', 12)).resolves.toBe(
        13,
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('workspace_revision=$2'),
        ['event-1', 12],
      );
    });

    it('unwraps TypeORM update returning results', async () => {
      query.mockResolvedValueOnce([[{ workspaceRevision: 13 }], 1]);

      await expect(claimWorkspaceRevision(mockDb, 'event-1', 12)).resolves.toBe(
        13,
      );
    });

    it('throws ConflictException with exact message on stale row', async () => {
      query.mockResolvedValueOnce([]);

      const claim = claimWorkspaceRevision(mockDb, 'event-1', 12);

      await expect(claim).rejects.toEqual(
        new ConflictException(WORKSPACE_CONFLICT_MESSAGE),
      );
    });
  });

  describe('readWorkspaceRevision', () => {
    it('returns current revision', async () => {
      query.mockResolvedValueOnce([{ workspaceRevision: 12 }]);

      await expect(readWorkspaceRevision(mockDb, 'event-1')).resolves.toBe(12);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('workspace_revision'),
        ['event-1'],
      );
    });

    it('throws when event row is missing', async () => {
      const rows: WorkspaceRevisionRow[] = [];
      query.mockResolvedValueOnce(rows);

      await expect(readWorkspaceRevision(mockDb, 'event-1')).rejects.toThrow(
        'Event not found',
      );
    });
  });
});
