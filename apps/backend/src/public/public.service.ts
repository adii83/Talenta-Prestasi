import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

/* ponytail: raw SQL queries — replace with typed repo when public API
   shape stabilises. Upgrade path: typed DTOs + QueryBuilder. */

interface SiteRow {
  eventId: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  eventName: string;
  eventSlug: string;
  organizerName: string;
  logoAssetId: string | null;
  primaryColor: string;
  navigation: Record<string, unknown>;
  contact: Record<string, unknown>;
  footer: Record<string, unknown>;
  seo: Record<string, unknown>;
  description: string | null;
  mascotAssetId: string | null;
  fallbackIcon: string | null;
}

@Injectable()
export class PublicService {
  constructor(private readonly db: DataSource) {}

  async bootstrap(hostname: string) {
    const normalized = hostname.trim().toLowerCase().replace(/\.$/, '');
    const site = await this.db.query<SiteRow[]>(
      `${SITE_SELECT}
       INNER JOIN site_domains domain ON domain.category_id = category.id
       WHERE LOWER(domain.hostname) = $1 AND domain.verified_at IS NOT NULL
         ${SITE_WHERE}
       LIMIT 1`,
      [normalized],
    );
    if (!site[0]) throw new NotFoundException('Published site not found');
    return this.bootstrapData(site[0]);
  }

  async bootstrapBySlug(categorySlug: string) {
    const site = await this.requireSite(categorySlug);
    return this.bootstrapData(site);
  }

  private bootstrapData(s: SiteRow) {
    return {
      data: {
        site: this.siteDto(s),
        settings: this.settingsDto(s),
        routes: ['home', 'downloads', 'winners', 'archives', 'faq'],
        currentEvent: {
          slug: s.eventSlug,
          name: s.eventName,
          description: s.description,
          mascotAssetId: s.mascotAssetId,
          fallbackIcon: s.fallbackIcon,
        },
      },
      errors: [],
    };
  }

  async home(categorySlug: string) {
    const s = await this.requireSite(categorySlug);
    const sections = await this.db.query(
      `SELECT id,section_type AS "type",sort_order AS "sortOrder",settings
       FROM home_sections WHERE event_site_id=$1 AND is_active=true
       ORDER BY sort_order,id`,
      [s.eventId],
    );
    return { data: { site: this.siteDto(s), sections }, errors: [] };
  }

  async downloads(categorySlug: string) {
    const s = await this.requireSite(categorySlug);
    const [tabs, pages] = await Promise.all([
      this.db.query(
        `SELECT tab.id,
                COALESCE(NULLIF(tab.custom_tab_name,''),category.name) AS "tabName",
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
         GROUP BY tab.id,category.name
         ORDER BY tab.is_default DESC,tab.sort_order,tab.id`,
        [s.eventId],
      ),
      this.db.query(
        `SELECT is_active AS "isActive",eyebrow,title,description,alignment FROM page_settings WHERE event_site_id=$1 AND page_type='download'`,
        [s.eventId],
      ),
    ]);
    return {
      data: { site: this.siteDto(s), page: pages[0] ?? null, tabs },
      errors: [],
    };
  }

  async faq(categorySlug: string) {
    const s = await this.requireSite(categorySlug);
    const [categories, pages] = await Promise.all([
      this.db.query(
        `SELECT category.title,
                COALESCE(jsonb_agg(jsonb_build_object(
                  'question',question.question,'answer',question.answer
                ) ORDER BY question.sort_order,question.id) FILTER (WHERE question.id IS NOT NULL),'[]') AS questions
         FROM faq_categories category
         LEFT JOIN faq_questions question ON question.category_id=category.id AND question.is_active=true
         WHERE category.event_site_id=$1 AND category.is_active=true
         GROUP BY category.id ORDER BY category.sort_order,category.id`,
        [s.eventId],
      ),
      this.db.query(
        `SELECT is_active AS "isActive",eyebrow,title,description,alignment FROM page_settings WHERE event_site_id=$1 AND page_type='faq'`,
        [s.eventId],
      ),
    ]);
    return {
      data: { site: this.siteDto(s), page: pages[0] ?? null, categories },
      errors: [],
    };
  }

  async winners(categorySlug: string) {
    const s = await this.requireSite(categorySlug);
    const [categories, pageRows, settingRows, archives] = await Promise.all([
      this.winnerCategories(s.eventId),
      this.db.query(
        `SELECT is_active AS "isActive",eyebrow,title,description,alignment FROM page_settings WHERE event_site_id=$1 AND page_type='winners'`,
        [s.eventId],
      ),
      this.db.query(
        `SELECT is_active AS "isActive",show_decree AS "showDecree",metadata_visibility AS "metadataVisibility",archive_active AS "archiveActive",archive_limit AS "archiveLimit" FROM winner_page_settings WHERE event_site_id=$1`,
        [s.eventId],
      ),
      this.archiveEvents(s.categoryId, s.eventId),
    ]);
    const settings = settingRows[0] ?? {};
    const limit = Number(settings.archiveLimit ?? 3);
    const decreeRows = await this.db.query(
      `SELECT COALESCE(NULLIF(st.decree_title,''),doc.title,'SK Penetapan Pemenang') AS title,
              COALESCE(NULLIF(st.decree_description,''),'Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah.') AS description,
              doc.id AS "documentId",doc.file_type AS "fileType",doc.display_size AS "displaySize",
              CASE WHEN doc.asset_id IS NULL THEN NULL ELSE '/api/v1/public/media/'||doc.asset_id::text END AS url
         FROM event_detail_settings st
         LEFT JOIN event_documents doc ON doc.id=st.decree_document_id AND doc.event_site_id=st.event_site_id
         WHERE st.event_site_id=$1`,
      [s.eventId],
    );
    return {
      data: {
        site: this.siteDto(s),
        event: { slug: s.eventSlug, name: s.eventName },
        categories,
        page: pageRows[0] ?? null,
        settings,
        decree: decreeRows[0] ?? null,
        archives: archives.slice(0, limit),
      },
      errors: [],
    };
  }

  async archives(categorySlug: string) {
    const s = await this.requireSite(categorySlug);
    const [events, pages] = await Promise.all([
      this.archiveEvents(s.categoryId, s.eventId),
      this.db.query(
        `SELECT is_active AS "isActive",eyebrow,title,description,alignment FROM page_settings WHERE event_site_id=$1 AND page_type='archive'`,
        [s.eventId],
      ),
    ]);
    return {
      data: { site: this.siteDto(s), page: pages[0] ?? null, events },
      errors: [],
    };
  }

  async archiveDetail(categorySlug: string, eventSlug: string) {
    const s = await this.requireSite(categorySlug);
    const archivedRows = await this.db.query(
      `SELECT id,name,slug,description,fallback_icon AS "fallbackIcon",mascot_asset_id AS "mascotAssetId"
       FROM event_sites WHERE category_id=$1 AND slug=$2 AND is_active=false AND deleted_at IS NULL`,
      [s.categoryId, eventSlug],
    );
    const archived = archivedRows[0];
    if (!archived)
      throw new NotFoundException('Published archive not found');
    const [categories, documents, settingRows] = await Promise.all([
      this.winnerCategories(archived.id),
      this.db.query(
        `SELECT d.id,d.title,d.category,d.document_role AS "documentRole",d.file_type AS "fileType",
                d.display_size AS "displaySize",d.asset_id AS "assetId",
                CASE WHEN d.asset_id IS NULL THEN NULL ELSE '/api/v1/public/media/'||d.asset_id::text END AS url
         FROM event_documents d
         LEFT JOIN archive_document_settings setting ON setting.document_id=d.id AND setting.event_site_id=d.event_site_id
         WHERE d.event_site_id=$1 AND d.is_active=true AND COALESCE(setting.is_visible,true)=true
         ORDER BY COALESCE(setting.sort_order,d.sort_order),d.id`,
        [archived.id],
      ),
      this.db.query(
        `SELECT decree_document_id AS "decreeDocumentId",decree_title AS "decreeTitle",decree_description AS "decreeDescription",is_active AS "isActive",winners_active AS "winnersActive",documents_active AS "documentsActive",metadata_visibility AS "metadataVisibility" FROM event_detail_settings WHERE event_site_id=$1`,
        [archived.id],
      ),
    ]);
    return {
      data: {
        site: this.siteDto(s),
        event: {
          slug: archived.slug,
          name: archived.name,
          description: archived.description,
          fallbackIcon: archived.fallbackIcon,
          mascotAssetId: archived.mascotAssetId,
        },
        settings: settingRows[0] ?? null,
        categories,
        documents,
      },
      errors: [],
    };
  }

  private archiveEvents(categoryId: string, activeEventId: string) {
    return this.db.query(
      `SELECT event.slug,event.name,event.description,event.fallback_icon AS icon
       FROM event_sites event
       WHERE event.category_id=$1 AND event.id<>$2 AND event.is_active=false AND event.deleted_at IS NULL
       ORDER BY event.created_at DESC,event.id`,
      [categoryId, activeEventId],
    );
  }

  private winnerCategories(eventId: string) {
    return this.db.query(
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
       GROUP BY category.id,setting.sort_order
       ORDER BY COALESCE(setting.sort_order,category.sort_order),category.id`,
      [eventId],
    );
  }

  private async requireSite(categorySlug: string): Promise<SiteRow> {
    const rows = await this.db.query<SiteRow[]>(
      `${SITE_SELECT} WHERE category.slug=$1 ${SITE_WHERE} LIMIT 1`,
      [categorySlug],
    );
    if (!rows[0]) throw new NotFoundException('Published site not found');
    return rows[0];
  }

  private siteDto(s: SiteRow) {
    return {
      name: s.categoryName,
      slug: s.categorySlug,
      organizerName: s.organizerName,
      logoAssetId: s.logoAssetId,
      logoUrl: s.logoAssetId
        ? `/api/v1/public/media/${s.logoAssetId}`
        : null,
    };
  }

  private settingsDto(s: SiteRow) {
    return {
      primaryColor: s.primaryColor ?? '#1e4b8c',
      navigation: s.navigation ?? {},
      contact: s.contact ?? {},
      footer: s.footer ?? {},
      seo: s.seo ?? {},
    };
  }
}

const SITE_SELECT = `SELECT
  event.id AS "eventId",
  category.id AS "categoryId",
  category.name AS "categoryName",
  category.slug AS "categorySlug",
  event.name AS "eventName",
  event.slug AS "eventSlug",
  category.organizer_name AS "organizerName",
  category.logo_asset_id AS "logoAssetId",
  settings.primary_color AS "primaryColor",
  settings.navigation AS "navigation",
  settings.contact AS "contact",
  settings.footer AS "footer",
  settings.seo AS "seo",
  event.description AS "description",
  event.mascot_asset_id AS "mascotAssetId",
  event.fallback_icon AS "fallbackIcon"
FROM competition_categories category
JOIN organizations org ON org.id=category.organization_id
JOIN event_sites event ON event.category_id=category.id AND event.is_active=true AND event.deleted_at IS NULL
LEFT JOIN site_settings settings ON settings.event_site_id=event.id`;

const SITE_WHERE = `AND category.status='active'
  AND event.status='active'
  AND category.deleted_at IS NULL
  AND org.status='active'
  AND org.deleted_at IS NULL`;
