import { ConflictException } from '@nestjs/common';

export const WORKSPACE_CONFLICT_MESSAGE =
  'Data Event telah diperbarui pengguna lain. Muat ulang sebelum menyimpan.';

export interface WorkspaceRevisionRow {
  workspaceRevision?: number;
  workspace_revision?: number;
}

export interface WorkspaceRevisionExecutor {
  query<T = WorkspaceRevisionRow[]>(
    sql: string,
    parameters?: unknown[],
  ): Promise<T>;
}

export async function claimWorkspaceRevision(
  executor: WorkspaceRevisionExecutor,
  eventId: string,
  expectedRevision: number,
): Promise<number> {
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
    throw new Error('expectedRevision must be an integer >= 1');
  }

  const result = await executor.query<
    WorkspaceRevisionRow[] | [WorkspaceRevisionRow[], number]
  >(
    `UPDATE event_sites SET workspace_revision=workspace_revision+1,updated_at=now()
     WHERE id=$1 AND workspace_revision=$2
     RETURNING workspace_revision AS "workspaceRevision"`,
    [eventId, expectedRevision],
  );
  const rows = (Array.isArray(result[0]) ? result[0] : result) as WorkspaceRevisionRow[];
  const revision = rows[0]?.workspaceRevision ?? rows[0]?.workspace_revision;

  if (typeof revision !== 'number' || !Number.isInteger(revision)) {
    throw new ConflictException(WORKSPACE_CONFLICT_MESSAGE);
  }

  return revision;
}

export async function readWorkspaceRevision(
  executor: WorkspaceRevisionExecutor,
  eventId: string,
): Promise<number> {
  const rows = await executor.query<WorkspaceRevisionRow[]>(
    `SELECT workspace_revision AS "workspaceRevision" FROM event_sites WHERE id=$1`,
    [eventId],
  );

  if (!rows || rows.length === 0) {
    throw new Error('Event not found');
  }

  const revision = rows[0]?.workspaceRevision ?? rows[0]?.workspace_revision;
  if (typeof revision !== 'number') throw new Error('Event workspace revision missing');
  return revision;
}
