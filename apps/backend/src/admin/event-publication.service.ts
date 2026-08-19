import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';
import { PreviewTokenService } from '../public/preview-token.service';
import { PublicContentService } from '../public/public-content.service';
import {
  WorkspaceSnapshotService,
  type WorkspaceSnapshot,
} from '../public/workspace-snapshot.service';

interface EventAccess {
  id: string;
  categoryId: string;
  organizationId: string;
  version: number;
  role: string;
}

@Injectable()
export class EventPublicationService {
  constructor(
    private readonly db: DataSource,
    private readonly publicContent: PublicContentService,
    private readonly workspace: WorkspaceSnapshotService,
    private readonly previewTokens: PreviewTokenService,
  ) {}

  async status(eventId: string, userId: string) {
    const access = await this.readAccess(this.db, eventId, userId);
    const current = await this.workspace.capture(eventId);
    const checksum = digest(current);
    const rows = await this.db.query<
      Array<{
        version: number;
        workspaceChecksum: string;
        publishedAt: Date;
        publishedBy: string | null;
        workspaceSnapshot: WorkspaceSnapshot;
      }>
    >(
      `SELECT version,workspace_checksum AS "workspaceChecksum",published_at AS "publishedAt",
              published_by AS "publishedBy",workspace_snapshot AS "workspaceSnapshot"
       FROM event_publications WHERE event_site_id=$1`,
      [eventId],
    );
    const publication = rows[0];
    const changedModuleNames = publication
      ? findChangedModules(publication.workspaceSnapshot, current)
      : ['Pengaturan', 'Beranda', 'Unduh', 'FAQ', 'Pemenang', 'Arsip'];
    return {
      data: {
        publicationState: publication
          ? checksum === publication.workspaceChecksum
            ? 'clean'
            : 'draft'
          : 'unpublished',
        draftChanged: !publication || checksum !== publication.workspaceChecksum,
        publishedVersion: publication?.version ?? null,
        publishedAt: publication?.publishedAt ?? null,
        publishedBy: publication?.publishedBy ?? null,
        changedModules: changedModuleNames,
        eventVersion: access.version,
        workspaceChecksum: checksum,
        readiness: {
          canActivate: Boolean(publication),
          blockers: publication ? [] : ['Publikasikan isi Event terlebih dahulu'],
        },
        role: access.role,
      },
      errors: [],
    };
  }

  async previewToken(eventId: string, userId: string) {
    const access = await this.readAccess(this.db, eventId, userId);
    const issued = await this.previewTokens.issue({
      purpose: 'event-preview',
      sub: userId,
      organizationId: access.organizationId,
      categoryId: access.categoryId,
      eventId,
    });
    return { data: issued, errors: [] };
  }

  async publish(
    eventId: string,
    userId: string,
    expectedVersion?: number,
    expectedChecksum?: string,
  ) {
    return this.db.transaction('REPEATABLE READ', async (manager) => {
      const access = await this.writeAccess(manager, eventId, userId);
      if (expectedVersion && access.version !== expectedVersion)
        throw new ConflictException('Event telah diperbarui pengguna lain');
      const [publicSnapshot, workspaceSnapshot] = await Promise.all([
        this.publicContent.build(eventId, manager),
        this.workspace.capture(eventId, manager),
      ]);
      const checksum = digest(workspaceSnapshot);
      if (expectedChecksum && checksum !== expectedChecksum)
        throw new ConflictException('Draf telah diperbarui pengguna lain');
      const assets = collectAssetIds(publicSnapshot);
      const publications = await manager.query<Array<{ version: number }>>(
        `INSERT INTO event_publications(
           event_site_id,organization_id,category_id,version,schema_version,
           public_snapshot,workspace_snapshot,workspace_checksum,published_at,published_by
         ) VALUES($1,$2,$3,1,1,$4,$5,$6,now(),$7)
         ON CONFLICT(event_site_id) DO UPDATE SET
           version=event_publications.version+1,schema_version=EXCLUDED.schema_version,
           public_snapshot=EXCLUDED.public_snapshot,workspace_snapshot=EXCLUDED.workspace_snapshot,
           workspace_checksum=EXCLUDED.workspace_checksum,published_at=now(),published_by=EXCLUDED.published_by
         RETURNING version`,
        [
          eventId,
          access.organizationId,
          access.categoryId,
          publicSnapshot,
          workspaceSnapshot,
          checksum,
          userId,
        ],
      );
      await manager.query(
        `DELETE FROM event_publication_assets WHERE event_site_id=$1`,
        [eventId],
      );
      if (assets.length)
        await manager.query(
          `INSERT INTO event_publication_assets(event_site_id,asset_id)
           SELECT $1,asset.id FROM media_assets asset
           WHERE asset.id=ANY($2::uuid[]) AND asset.organization_id=$3 AND asset.status='active'`,
          [eventId, assets, access.organizationId],
        );
      await this.publishChangedArchives(
        manager,
        access.categoryId,
        access.organizationId,
        eventId,
        userId,
      );
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes)
         VALUES($1,$2,'publish','event_publication',$1,$3)`,
        [eventId, userId, JSON.stringify({ version: publications[0].version })],
      );
      return {
        data: {
          publicationState: 'published',
          publishedVersion: publications[0].version,
          publishedAt: new Date().toISOString(),
          draftChanged: false,
          changedModules: [],
          eventVersion: access.version,
        },
        errors: [],
      };
    });
  }

  async discardDraft(
    eventId: string,
    userId: string,
    expectedVersion?: number,
    expectedChecksum?: string,
  ) {
    return this.db.transaction('REPEATABLE READ', async (manager) => {
      const access = await this.writeAccess(manager, eventId, userId);
      if (expectedVersion && access.version !== expectedVersion)
        throw new ConflictException('Event telah diperbarui pengguna lain');
      if (expectedChecksum) {
        const current = await this.workspace.capture(eventId, manager);
        if (digest(current) !== expectedChecksum)
          throw new ConflictException('Draf telah diperbarui pengguna lain');
      }
      const rows = await manager.query<
        Array<{ workspaceSnapshot: WorkspaceSnapshot }>
      >(
        `SELECT workspace_snapshot AS "workspaceSnapshot" FROM event_publications WHERE event_site_id=$1`,
        [eventId],
      );
      if (!rows[0])
        throw new BadRequestException(
          'Event belum pernah dipublikasikan dan tidak memiliki draf acuan',
        );
      await this.workspace.restore(eventId, rows[0].workspaceSnapshot, manager);
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes)
         VALUES($1,$2,'restore','event_publication',$1,'{}')`,
        [eventId, userId],
      );
      return { data: { discarded: true }, errors: [] };
    });
  }

  private async publishChangedArchives(
    executor: { query: DataSource['query'] },
    categoryId: string,
    organizationId: string,
    activeEventId: string,
    userId: string,
  ) {
    const archives = await executor.query<Array<{ id: string }>>(
      `SELECT archive.id FROM event_sites archive
       JOIN event_publications publication ON publication.event_site_id=archive.id
       JOIN event_sites active ON active.id=$2
       WHERE archive.category_id=$1 AND archive.deleted_at IS NULL
         AND (
           archive.period_year<active.period_year OR
           (archive.period_year=active.period_year AND COALESCE(archive.batch_number,1)<COALESCE(active.batch_number,1))
         )
         AND (
           publication.public_snapshot #>> '{archiveDetail,event,mascotAssetId}' IS DISTINCT FROM archive.mascot_asset_id::text OR
           publication.public_snapshot #>> '{archiveDetail,event,fallbackIcon}' IS DISTINCT FROM archive.fallback_icon
         )`,
      [categoryId, activeEventId],
    );
    for (const archive of archives) {
      const snapshot = await this.publicContent.build(archive.id, executor);
      const assets = collectAssetIds(snapshot);
      await executor.query(
        `UPDATE event_publications
         SET version=version+1,public_snapshot=$2,published_at=now(),published_by=$3
         WHERE event_site_id=$1`,
        [archive.id, snapshot, userId],
      );
      await executor.query(
        `DELETE FROM event_publication_assets WHERE event_site_id=$1`,
        [archive.id],
      );
      if (assets.length)
        await executor.query(
          `INSERT INTO event_publication_assets(event_site_id,asset_id)
           SELECT $1,asset.id FROM media_assets asset
           WHERE asset.id=ANY($2::uuid[]) AND asset.organization_id=$3 AND asset.status='active'`,
          [archive.id, assets, organizationId],
        );
    }
  }

  private async readAccess(
    executor: { query: DataSource['query'] },
    eventId: string,
    userId: string,
  ) {
    const rows = await executor.query<EventAccess[]>(
      `SELECT event.id,event.category_id AS "categoryId",event.organization_id AS "organizationId",
              event.version,membership.role
       FROM event_sites event
       JOIN organization_memberships membership ON membership.organization_id=event.organization_id
       WHERE event.id=$1 AND membership.user_id=$2 AND event.deleted_at IS NULL`,
      [eventId, userId],
    );
    if (!rows[0]) throw new ForbiddenException('Event access denied');
    return rows[0];
  }

  private async writeAccess(
    executor: { query: DataSource['query'] },
    eventId: string,
    userId: string,
  ) {
    const access = await this.readAccess(executor, eventId, userId);
    if (!['owner', 'admin', 'editor'].includes(access.role))
      throw new ForbiddenException('Event write access denied');
    return access;
  }
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(',')}}`;
  return JSON.stringify(value);
}

function digest(value: unknown) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function findChangedModules(
  previous: WorkspaceSnapshot,
  current: WorkspaceSnapshot,
) {
  const groups: Record<string, string[]> = {
    Pengaturan: ['event_sites', 'site_settings'],
    Beranda: [
      'home_sections',
      'hero_badges',
      'hero_actions',
      'schedule_items',
      'pricing_packages',
      'pricing_facilities',
      'benefit_items',
      'partner_items',
    ],
    Unduh: ['event_documents', 'download_tabs', 'download_document_settings'],
    FAQ: ['faq_categories', 'faq_questions'],
    Pemenang: ['winner_categories', 'winners', 'winner_page_settings'],
    Arsip: [
      'event_detail_settings',
      'archive_category_settings',
      'archive_document_settings',
      'page_settings',
    ],
  };
  return Object.entries(groups)
    .filter(([, tables]) =>
      tables.some(
        (table) =>
          canonicalJson(previous.rows[table] ?? []) !==
          canonicalJson(current.rows[table] ?? []),
      ),
    )
    .map(([name]) => name);
}

export function collectAssetIds(
  value: unknown,
  result = new Set<string>(),
): string[] {
  if (typeof value === 'string') {
    const direct = value.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    const mediaUrl = value.match(
      /\/api\/v1\/public\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i,
    );
    if (direct) result.add(direct[0]);
    if (mediaUrl) result.add(mediaUrl[1]);
  } else if (Array.isArray(value))
    value.forEach((item) => collectAssetIds(item, result));
  else if (value && typeof value === 'object')
    Object.values(value).forEach((item) => collectAssetIds(item, result));
  return [...result];
}
