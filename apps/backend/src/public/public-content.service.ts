import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface QueryExecutor {
  query<T = Record<string, unknown>[]>(
    sql: string,
    parameters?: unknown[],
  ): Promise<T>;
}

interface SiteRow {
  eventId: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  eventName: string;
  eventSlug: string;
  periodYear: number | null;
  batchNumber: number | null;
  batchLabel: string | null;
  organizerName: string;
  logoAssetId: string | null;
  primaryColor: string;
  navigation: Record<string, unknown>;
  contact: Record<string, unknown>;
  footer: Record<string, unknown>;
  seo: Record<string, unknown>;
  description: string;
  mascotAssetId: string | null;
  fallbackIcon: string;
}

export interface PublicEventSnapshot {
  schemaVersion: 1;
  bootstrap: Record<string, unknown>;
  home: Record<string, unknown>;
  downloads: Record<string, unknown>;
  faq: Record<string, unknown>;
  winners: Record<string, unknown>;
  archivePage: Record<string, unknown>;
  archiveDetail: Record<string, unknown>;
}

@Injectable()
export class PublicContentService {
  constructor(private readonly db: DataSource) {}

  async build(
    eventId: string,
    executor: QueryExecutor = this.db,
  ): Promise<PublicEventSnapshot> {
    const siteRows = await executor.query<SiteRow[]>(SITE_QUERY, [eventId]);
    const site = siteRows[0];
    if (!site) throw new NotFoundException('Event workspace not found');
    const siteDto = this.siteDto(site);

    const [
      homeSections,
      downloadTabs,
      downloadPages,
      faqCategories,
      faqPages,
      winnerCategories,
      winnerPages,
      winnerSettings,
      detailSettings,
      archivePages,
      documents,
    ] = await Promise.all([
      executor.query(
        `SELECT id,section_type AS "type",sort_order AS "sortOrder",settings
         FROM home_sections WHERE event_site_id=$1 AND is_active=true ORDER BY sort_order,id`,
        [eventId],
      ),
      executor.query(
        `SELECT tab.id,COALESCE(NULLIF(tab.custom_tab_name,''),category.name) AS "tabName",
                tab.is_default AS "isDefault",
                COALESCE(jsonb_agg(jsonb_build_object(
                  'title',d.title,'category',d.category,'fileType',d.file_type,
                  'displaySize',d.display_size,'assetId',d.asset_id,
                  'url',CASE WHEN d.asset_id IS NULL THEN NULL ELSE '/api/v1/public/media/'||d.asset_id::text END
                ) ORDER BY dds.sort_order,d.sort_order) FILTER (WHERE d.id IS NOT NULL),'[]') AS documents
         FROM download_tabs tab
         JOIN event_sites event ON event.id=tab.event_site_id
         JOIN competition_categories category ON category.id=event.category_id
         LEFT JOIN download_document_settings dds ON dds.download_tab_id=tab.id AND dds.is_visible=true
         LEFT JOIN event_documents d ON d.id=dds.document_id AND d.event_site_id=tab.event_site_id AND d.is_active=true
         WHERE tab.event_site_id=$1 AND tab.is_active=true
         GROUP BY tab.id,category.name ORDER BY tab.is_default DESC,tab.sort_order,tab.id`,
        [eventId],
      ),
      executor.query(
        `SELECT is_active AS "isActive",eyebrow,title,description,alignment
         FROM page_settings WHERE event_site_id=$1 AND page_type='download'`,
        [eventId],
      ),
      executor.query(
        `SELECT category.title,
                COALESCE(jsonb_agg(jsonb_build_object('question',question.question,'answer',question.answer)
                ORDER BY question.sort_order,question.id) FILTER (WHERE question.id IS NOT NULL),'[]') AS questions
         FROM faq_categories category
         LEFT JOIN faq_questions question ON question.category_id=category.id AND question.is_active=true
         WHERE category.event_site_id=$1 AND category.is_active=true
         GROUP BY category.id ORDER BY category.sort_order,category.id`,
        [eventId],
      ),
      executor.query(
        `SELECT is_active AS "isActive",eyebrow,title,description,alignment
         FROM page_settings WHERE event_site_id=$1 AND page_type='faq'`,
        [eventId],
      ),
      this.winnerCategories(eventId, executor),
      executor.query(
        `SELECT is_active AS "isActive",eyebrow,title,description,alignment
         FROM page_settings WHERE event_site_id=$1 AND page_type='winners'`,
        [eventId],
      ),
      executor.query(
        `SELECT is_active AS "isActive",show_decree AS "showDecree",
                metadata_visibility AS "metadataVisibility",archive_active AS "archiveActive",
                archive_limit AS "archiveLimit"
         FROM winner_page_settings WHERE event_site_id=$1`,
        [eventId],
      ),
      executor.query(
        `SELECT decree_document_id AS "decreeDocumentId",decree_title AS "decreeTitle",
                decree_description AS "decreeDescription",is_active AS "isActive",
                winners_active AS "winnersActive",documents_active AS "documentsActive",
                metadata_visibility AS "metadataVisibility"
         FROM event_detail_settings WHERE event_site_id=$1`,
        [eventId],
      ),
      executor.query(
        `SELECT is_active AS "isActive",eyebrow,title,description,alignment
         FROM page_settings WHERE event_site_id=$1 AND page_type='archive'`,
        [eventId],
      ),
      executor.query(
        `SELECT d.id,d.title,d.category,d.document_role AS "documentRole",d.file_type AS "fileType",
                d.display_size AS "displaySize",d.asset_id AS "assetId",
                CASE WHEN d.asset_id IS NULL THEN NULL ELSE '/api/v1/public/media/'||d.asset_id::text END AS url
         FROM event_documents d
         LEFT JOIN archive_document_settings setting ON setting.document_id=d.id AND setting.event_site_id=d.event_site_id
         WHERE d.event_site_id=$1 AND d.is_active=true AND COALESCE(setting.is_visible,true)=true
         ORDER BY COALESCE(setting.sort_order,d.sort_order),d.id`,
        [eventId],
      ),
    ]);

    const settings = this.settingsDto(site);
    const event = {
      slug: site.eventSlug,
      name: eventDisplayName(
        site.eventName,
        site.periodYear,
        site.batchLabel,
        site.batchNumber,
      ),
      periodYear: site.periodYear,
      batchNumber: site.batchNumber,
      batchLabel: site.batchLabel,
      description: site.description,
      mascotAssetId: site.mascotAssetId,
      fallbackIcon: site.fallbackIcon,
    };
    const decree = await executor.query(
      `SELECT COALESCE(NULLIF(st.decree_title,''),doc.title,'SK Penetapan Pemenang') AS title,
              COALESCE(NULLIF(st.decree_description,''),'Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah.') AS description,
              doc.id AS "documentId",doc.file_type AS "fileType",doc.display_size AS "displaySize",
              CASE WHEN doc.asset_id IS NULL THEN NULL ELSE '/api/v1/public/media/'||doc.asset_id::text END AS url
       FROM event_detail_settings st
       LEFT JOIN event_documents doc ON doc.id=st.decree_document_id AND doc.event_site_id=st.event_site_id
       WHERE st.event_site_id=$1`,
      [eventId],
    );

    return {
      schemaVersion: 1,
      bootstrap: {
        site: siteDto,
        settings,
        routes: ['home', 'downloads', 'winners', 'archives', 'faq'],
        currentEvent: event,
      },
      home: { site: siteDto, sections: homeSections },
      downloads: {
        site: siteDto,
        page: downloadPages[0] ?? null,
        tabs: downloadTabs,
      },
      faq: {
        site: siteDto,
        page: faqPages[0] ?? null,
        categories: faqCategories,
      },
      winners: {
        site: siteDto,
        event: {
          slug: event.slug,
          name: event.name,
          periodYear: event.periodYear,
          batchNumber: event.batchNumber,
          batchLabel: event.batchLabel,
        },
        categories: winnerCategories,
        page: winnerPages[0] ?? null,
        settings: winnerSettings[0] ?? {},
        decree: decree[0] ?? null,
      },
      archivePage: { site: siteDto, page: archivePages[0] ?? null },
      archiveDetail: {
        event,
        settings: detailSettings[0] ?? null,
        categories: winnerCategories,
        documents,
      },
    };
  }

  private winnerCategories(eventId: string, executor: QueryExecutor) {
    return executor.query(
      `SELECT category.name,category.rank_prefix AS "rankPrefix",category.icon,
              COALESCE(jsonb_agg(jsonb_build_object(
                'rankLabel',winner.rank_label,'fullName',winner.full_name,
                'school',winner.school,'examNumber',winner.exam_number,
                'regency',winner.regency,'province',winner.province,
                'photoAssetId',winner.photo_asset_id,
                'photoUrl',CASE WHEN winner.photo_asset_id IS NULL THEN NULL ELSE '/api/v1/public/media/'||winner.photo_asset_id::text END
              ) ORDER BY winner.sort_order,winner.id) FILTER (WHERE winner.id IS NOT NULL),'[]') AS winners
       FROM winner_categories category
       LEFT JOIN winners winner ON winner.category_id=category.id AND winner.event_site_id=category.event_site_id AND winner.is_active=true
       LEFT JOIN archive_category_settings setting ON setting.category_id=category.id AND setting.event_site_id=category.event_site_id
       WHERE category.event_site_id=$1 AND category.is_active=true AND COALESCE(setting.is_visible,true)=true
       GROUP BY category.id,setting.sort_order ORDER BY COALESCE(setting.sort_order,category.sort_order),category.id`,
      [eventId],
    );
  }

  private siteDto(site: SiteRow) {
    return {
      name: site.categoryName,
      slug: site.categorySlug,
      organizerName: site.organizerName,
      logoAssetId: site.logoAssetId,
      logoUrl: site.logoAssetId
        ? `/api/v1/public/media/${site.logoAssetId}`
        : null,
    };
  }

  private settingsDto(site: SiteRow) {
    return {
      primaryColor: site.primaryColor ?? '#1e4b8c',
      navigation: site.navigation ?? {},
      contact: site.contact ?? {},
      footer: site.footer ?? {},
      seo: site.seo ?? {},
    };
  }
}

export function eventDisplayName(
  baseName: string,
  periodYear: number | null,
  batchLabel: string | null,
  batchNumber: number | null,
) {
  if (!periodYear) return baseName;
  const period = `${baseName} ${periodYear}`;
  return batchLabel && batchNumber
    ? `${period} · ${batchLabel} ${batchNumber}`
    : period;
}

const SITE_QUERY = `SELECT
  event.id AS "eventId",category.id AS "categoryId",category.name AS "categoryName",
  category.slug AS "categorySlug",event.name AS "eventName",event.slug AS "eventSlug",
  event.period_year AS "periodYear",event.batch_number AS "batchNumber",event.batch_label AS "batchLabel",
  category.organizer_name AS "organizerName",category.logo_asset_id AS "logoAssetId",
  settings.primary_color AS "primaryColor",settings.navigation,settings.contact,settings.footer,settings.seo,
  event.description,event.mascot_asset_id AS "mascotAssetId",event.fallback_icon AS "fallbackIcon"
FROM event_sites event
JOIN competition_categories category ON category.id=event.category_id
LEFT JOIN site_settings settings ON settings.event_site_id=event.id
WHERE event.id=$1 AND event.deleted_at IS NULL AND category.deleted_at IS NULL`;
