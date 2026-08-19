import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PreviewTokenService } from './preview-token.service';
import {
  eventDisplayName,
  PublicContentService,
  type PublicEventSnapshot,
} from './public-content.service';

interface ResolvedEvent {
  eventId: string;
  categoryId: string;
  categorySlug?: string;
  snapshot: PublicEventSnapshot;
  preview: boolean;
  baseName?: string;
  periodYear?: number | null;
  batchNumber?: number | null;
  batchLabel?: string | null;
  showBatch?: boolean;
}

@Injectable()
export class PublicService {
  constructor(
    private readonly db: DataSource,
    private readonly content: PublicContentService,
    private readonly previewTokens: PreviewTokenService,
  ) {}

  async bootstrap(hostname: string, previewToken = '') {
    const resolved = previewToken
      ? await this.previewByHostname(hostname, previewToken)
      : await this.publishedByHostname(hostname);
    return response(
      publicSnapshotSection(resolved, 'bootstrap'),
      resolved.preview,
    );
  }

  async bootstrapBySlug(categorySlug: string, previewToken = '') {
    const resolved = await this.resolve(categorySlug, previewToken);
    return response(
      publicSnapshotSection(resolved, 'bootstrap'),
      resolved.preview,
    );
  }

  async home(categorySlug: string, previewToken = '') {
    const resolved = await this.resolve(categorySlug, previewToken);
    return response(resolved.snapshot.home, resolved.preview);
  }

  async downloads(categorySlug: string, previewToken = '') {
    const resolved = await this.resolve(categorySlug, previewToken);
    return response(resolved.snapshot.downloads, resolved.preview);
  }

  async faq(categorySlug: string, previewToken = '') {
    const resolved = await this.resolve(categorySlug, previewToken);
    return response(resolved.snapshot.faq, resolved.preview);
  }

  async winners(categorySlug: string, previewToken = '') {
    const resolved = await this.resolve(categorySlug, previewToken);
    const base = publicSnapshotSection(
      resolved,
      'winners',
    ) as Record<string, unknown>;
    const settings = (base.settings ?? {}) as { archiveLimit?: number };
    const archives = await this.archiveSnapshots(
      resolved.categoryId,
      resolved.eventId,
    );
    return response(
      {
        ...base,
        archives: archives
          .map((item) => archiveSummary(item, resolved.preview))
          .slice(0, Number(settings.archiveLimit ?? 3)),
      },
      resolved.preview,
    );
  }

  async archives(categorySlug: string, previewToken = '') {
    const resolved = await this.resolve(categorySlug, previewToken);
    const events = await this.archiveSnapshots(
      resolved.categoryId,
      resolved.eventId,
    );
    return response(
      {
        ...resolved.snapshot.archivePage,
        events: events.map((item) =>
          archiveSummary(item, resolved.preview),
        ),
      },
      resolved.preview,
    );
  }

  async archiveDetail(
    categorySlug: string,
    eventSlug: string,
    previewToken = '',
  ) {
    const resolved = await this.resolve(categorySlug, previewToken);
    if (
      resolved.preview &&
      (eventSlug === resolved.eventId ||
        eventSlug ===
          String(
            (resolved.snapshot.archiveDetail as { event?: { slug?: unknown } })
              .event?.slug || '',
          ))
    )
      return response(
        {
          site: (resolved.snapshot.bootstrap as { site?: unknown }).site,
          ...resolved.snapshot.archiveDetail,
        },
        true,
      );
    const rows = await this.db.query<ArchiveSnapshot[]>(
      `SELECT publication.public_snapshot AS snapshot,event.id AS "eventId",
              event.slug AS "eventSlug",event.name AS "baseName",
              event.period_year AS "periodYear",event.batch_number AS "batchNumber",
              event.batch_label AS "batchLabel",
              EXISTS(
                SELECT 1 FROM event_sites sibling
                WHERE sibling.category_id=event.category_id
                  AND sibling.period_year=event.period_year
                  AND sibling.batch_number>1
              ) AS "showBatch"
       FROM event_sites event
       LEFT JOIN event_publications publication ON publication.event_site_id=event.id
       JOIN event_sites current_event ON current_event.id=$3
       WHERE event.category_id=$1 AND (event.slug=$2 OR event.id::text=$2) AND event.deleted_at IS NULL
         AND (
           event.period_year < current_event.period_year
           OR (
             event.period_year = current_event.period_year
             AND COALESCE(event.batch_number, 1) < COALESCE(current_event.batch_number, 1)
           )
         )`,
      [resolved.categoryId, eventSlug, resolved.eventId],
    );
    if (!rows[0]) throw new NotFoundException('Archive event not found');
    let snapshot = rows[0].snapshot;
    if (!snapshot) {
      const eventTargetId = (rows[0] as unknown as { eventId: string }).eventId;
      snapshot = await this.content.build(eventTargetId);
    }
    return response(
      {
        site: (resolved.snapshot.bootstrap as { site?: unknown }).site,
        ...snapshot.archiveDetail,
        event: archiveSummary({ ...rows[0], snapshot }),
      },
      resolved.preview,
    );
  }

  async validatePreview(token: string) {
    const claims = await this.previewTokens.verify(token);
    const rows = await this.db.query(
      `SELECT event.id FROM event_sites event
       JOIN competition_categories category ON category.id=event.category_id
       JOIN organization_memberships membership ON membership.organization_id=event.organization_id
       WHERE event.id=$1 AND event.category_id=$2 AND event.organization_id=$3
         AND membership.user_id=$4 AND event.deleted_at IS NULL AND category.deleted_at IS NULL`,
      [
        claims.eventId,
        claims.categoryId,
        claims.organizationId,
        claims.sub,
      ],
    );
    if (!rows[0]) throw new ForbiddenException('Preview access denied');
    return claims;
  }

  private resolve(categorySlug: string, previewToken: string) {
    return previewToken
      ? this.previewBySlug(categorySlug, previewToken)
      : this.publishedBySlug(categorySlug);
  }

  private async publishedBySlug(categorySlug: string) {
    const rows = await this.db.query<
      Array<{
        eventId: string;
        categoryId: string;
        snapshot: PublicEventSnapshot;
      }>
    >(`${PUBLISHED_SELECT} WHERE category.slug=$1 ${PUBLISHED_WHERE} LIMIT 1`, [
      categorySlug,
    ]);
    if (!rows[0]) throw new NotFoundException('Published site not found');
    return { ...rows[0], preview: false };
  }

  private async publishedByHostname(hostname: string) {
    const normalized = hostname.trim().toLowerCase().replace(/\.$/, '');
    const rows = await this.db.query<
      Array<{
        eventId: string;
        categoryId: string;
        snapshot: PublicEventSnapshot;
      }>
    >(
      `${PUBLISHED_SELECT}
       JOIN site_domains domain ON domain.category_id=category.id
       WHERE LOWER(domain.hostname)=$1 AND domain.verified_at IS NOT NULL
       ${PUBLISHED_WHERE} LIMIT 1`,
      [normalized],
    );
    if (!rows[0]) throw new NotFoundException('Published site not found');
    return { ...rows[0], preview: false };
  }

  private async previewBySlug(categorySlug: string, token: string) {
    const claims = await this.previewTokens.verify(token);
    const rows = await this.db.query<
      Array<{ eventId: string; categoryId: string; categorySlug: string }>
    >(
      `${PREVIEW_SELECT} WHERE event.id=$1 AND category.slug=$2
       AND membership.user_id=$3 AND event.category_id=$4 AND event.organization_id=$5
       AND event.deleted_at IS NULL AND category.deleted_at IS NULL LIMIT 1`,
      [
        claims.eventId,
        categorySlug,
        claims.sub,
        claims.categoryId,
        claims.organizationId,
      ],
    );
    if (!rows[0]) throw new ForbiddenException('Preview access denied');
    return {
      ...rows[0],
      snapshot: await this.content.build(claims.eventId),
      preview: true,
    };
  }

  private async previewByHostname(hostname: string, token: string) {
    const claims = await this.previewTokens.verify(token);
    const normalized = hostname.trim().toLowerCase().replace(/\.$/, '');
    const rows = await this.db.query<
      Array<{ eventId: string; categoryId: string; categorySlug: string }>
    >(
      `${PREVIEW_SELECT}
       JOIN site_domains domain ON domain.category_id=category.id
       WHERE event.id=$1 AND LOWER(domain.hostname)=$2 AND domain.verified_at IS NOT NULL
         AND membership.user_id=$3 AND event.category_id=$4 AND event.organization_id=$5
         AND event.deleted_at IS NULL AND category.deleted_at IS NULL LIMIT 1`,
      [
        claims.eventId,
        normalized,
        claims.sub,
        claims.categoryId,
        claims.organizationId,
      ],
    );
    if (!rows[0]) throw new ForbiddenException('Preview access denied');
    return {
      ...rows[0],
      snapshot: await this.content.build(claims.eventId),
      preview: true,
    };
  }

  private archiveSnapshots(categoryId: string, activeEventId: string) {
    return this.db.query<ArchiveSnapshot[]>(
      `SELECT publication.public_snapshot AS snapshot,event.id AS "eventId",event.slug AS "eventSlug",event.name AS "baseName",
              event.mascot_asset_id AS "mascotAssetId",event.fallback_icon AS "fallbackIcon",
              event.period_year AS "periodYear",event.batch_number AS "batchNumber",
              event.batch_label AS "batchLabel",
              EXISTS(
                SELECT 1 FROM event_sites sibling
                WHERE sibling.category_id=event.category_id
                  AND sibling.period_year=event.period_year
                  AND sibling.batch_number>1
              ) AS "showBatch"
       FROM event_sites event
       JOIN event_publications publication ON publication.event_site_id=event.id
       JOIN event_sites current_event ON current_event.id=$2
       WHERE event.category_id=$1 AND event.id<>$2 AND event.deleted_at IS NULL
         AND (
           event.period_year < current_event.period_year
           OR (
             event.period_year = current_event.period_year
             AND COALESCE(event.batch_number, 1) < COALESCE(current_event.batch_number, 1)
           )
         )
       ORDER BY event.period_year DESC, COALESCE(event.batch_number, 1) DESC, publication.published_at DESC, event.id`,
      [categoryId, activeEventId],
    );
  }
}

function response(data: unknown, preview: boolean) {
  return { data, errors: [], preview };
}

function publicSnapshotSection(
  resolved: ResolvedEvent,
  key: keyof PublicEventSnapshot,
) {
  const section = resolved.snapshot[key] as Record<string, unknown>;
  if (resolved.preview || !resolved.periodYear) return section;
  const field = key === 'bootstrap' ? 'currentEvent' : key === 'winners' ? 'event' : '';
  if (!field) return section;
  const event = section[field] as Record<string, unknown>;
  return {
    ...section,
    [field]: {
      ...event,
      name: eventDisplayName(
        resolved.baseName || String(event.name || ''),
        resolved.periodYear,
        resolved.showBatch ? (resolved.batchLabel ?? null) : null,
        resolved.showBatch ? (resolved.batchNumber ?? null) : null,
      ),
      periodYear: resolved.periodYear,
      batchNumber: resolved.batchNumber ?? null,
      batchLabel: resolved.batchLabel ?? null,
    },
  };
}

interface ArchiveSnapshot {
  snapshot: PublicEventSnapshot;
  eventId: string;
  eventSlug: string;
  baseName: string;
  mascotAssetId?: string | null;
  fallbackIcon?: string;
  periodYear: number | null;
  batchNumber: number | null;
  batchLabel: string | null;
  showBatch: boolean;
}

function archiveSummary(item: ArchiveSnapshot, preview = false) {
  const detail = item.snapshot.archiveDetail as {
    event: Record<string, unknown>;
    settings?: { archiveDisplayName?: unknown } | null;
  };
  const archiveDisplayName = detail.settings?.archiveDisplayName;
  const name =
    typeof archiveDisplayName === 'string' && archiveDisplayName.trim()
      ? archiveDisplayName
      : item.showBatch
        ? eventDisplayName(
            item.baseName,
            item.periodYear,
            item.batchLabel,
            item.batchNumber,
          )
        : eventDisplayName(item.baseName, item.periodYear, null, null);
  return {
    ...detail.event,
    mascotAssetId: preview
      ? item.mascotAssetId ?? (detail.event.mascotAssetId as string | null) ?? null
      : (detail.event.mascotAssetId as string | null) ?? item.mascotAssetId ?? null,
    fallbackIcon: preview
      ? item.fallbackIcon || (detail.event.fallbackIcon as string) || 'archive'
      : (detail.event.fallbackIcon as string) || item.fallbackIcon || 'archive',
    slug: item.eventSlug,
    name,
    periodYear: item.periodYear,
    batchNumber: item.batchNumber,
    batchLabel: item.batchLabel,
  };
}

const PUBLISHED_SELECT = `SELECT event.id AS "eventId",category.id AS "categoryId",
  publication.public_snapshot AS snapshot,event.name AS "baseName",
  event.period_year AS "periodYear",event.batch_number AS "batchNumber",
  event.batch_label AS "batchLabel",
  EXISTS(
    SELECT 1 FROM event_sites sibling
    WHERE sibling.category_id=event.category_id
      AND sibling.period_year=event.period_year
      AND sibling.batch_number>1
      AND sibling.activated_at IS NOT NULL
  ) AS "showBatch"
FROM competition_categories category
JOIN organizations org ON org.id=category.organization_id
JOIN event_sites event ON event.category_id=category.id AND event.is_active=true AND event.deleted_at IS NULL
JOIN event_publications publication ON publication.event_site_id=event.id`;

const PUBLISHED_WHERE = `AND category.publication_status='published'
  AND category.status='active' AND event.status='active'
  AND category.deleted_at IS NULL AND org.status='active' AND org.deleted_at IS NULL`;

const PREVIEW_SELECT = `SELECT event.id AS "eventId",category.id AS "categoryId",category.slug AS "categorySlug"
FROM event_sites event
JOIN competition_categories category ON category.id=event.category_id
JOIN organization_memberships membership ON membership.organization_id=event.organization_id`;
