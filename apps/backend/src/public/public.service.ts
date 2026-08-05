import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventSite } from '../entities/event-site.entity';

interface PublicSiteRow {
  id: string;
  name: string;
  slug: string;
  organizerName: string;
  logoAssetId: string | null;
  primaryColor: string;
  navigation: Record<string, unknown>;
  contact: Record<string, unknown>;
  footer: Record<string, unknown>;
  seo: Record<string, unknown>;
}

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(EventSite)
    private readonly sites: Repository<EventSite>,
  ) {}

  async bootstrap(hostname: string) {
    const normalized = hostname.trim().toLowerCase().replace(/\.$/, '');
    const site = await this.publicSiteQuery()
      .innerJoin('site_domains', 'domain', 'domain.event_site_id = site.id')
      .andWhere('LOWER(domain.hostname) = :hostname', { hostname: normalized })
      .andWhere('domain.verified_at IS NOT NULL')
      .getRawOne<PublicSiteRow>();
    if (!site) throw new NotFoundException('Published site not found');
    return this.bootstrapData(site);
  }

  async bootstrapBySlug(siteSlug: string) {
    const site = await this.requirePublicSite(siteSlug);
    return this.bootstrapData(site);
  }

  private async bootstrapData(site: PublicSiteRow) {
    const competition = await this.sites.manager
      .createQueryBuilder()
      .select([
        'competition.slug AS "slug"',
        'competition.name AS "name"',
        'competition.short_name AS "shortName"',
        'competition.description AS "description"',
        'competition.fallback_icon AS "fallbackIcon"',
        'competition.mascot_asset_id AS "mascotAssetId"',
      ])
      .from('competitions', 'competition')
      .where('competition.event_site_id = :siteId', { siteId: site.id })
      .andWhere("competition.lifecycle = 'current'")
      .andWhere("competition.publication_status = 'published'")
      .andWhere('competition.deleted_at IS NULL')
      .getRawOne<Record<string, unknown>>();

    return {
      data: {
        site: this.siteDto(site),
        settings: this.settingsDto(site),
        routes: ['home', 'downloads', 'winners', 'archives', 'faq'],
        currentCompetition: competition ?? null,
      },
      errors: [],
    };
  }

  async home(siteSlug: string) {
    const site = await this.publicSiteQuery()
      .andWhere('site.slug = :siteSlug', { siteSlug })
      .getRawOne<PublicSiteRow>();
    if (!site) throw new NotFoundException('Published site not found');

    const sections = await this.sites.manager
      .createQueryBuilder()
      .select([
        'section.id AS "id"',
        'section.section_type AS "type"',
        'section.sort_order AS "sortOrder"',
        'section.settings AS "settings"',
      ])
      .from('home_sections', 'section')
      .where('section.event_site_id = :siteId', { siteId: site.id })
      .andWhere('section.is_active = true')
      .orderBy('section.sort_order', 'ASC')
      .addOrderBy('section.id', 'ASC')
      .getRawMany<Record<string, unknown>>();

    return { data: { site: this.siteDto(site), sections }, errors: [] };
  }

  async downloads(siteSlug: string) {
    const site = await this.requirePublicSite(siteSlug);
    const [competitions, pages] = await Promise.all([
      this.sites.manager.query<
        Array<{
          slug: string;
          name: string;
          tabName: string;
          isDefault: boolean;
          documents: unknown;
        }>
      >(
        `SELECT dc.id, c.slug, c.name,
              COALESCE(NULLIF(dc.custom_tab_name, ''), c.short_name, c.name) AS "tabName",
              dc.is_default AS "isDefault",
              COALESCE(jsonb_agg(jsonb_build_object(
                'title', d.title,
                'category', d.category,
                'fileType', d.file_type,
                'displaySize', d.display_size,
                'assetId', d.asset_id,
                'url', CASE WHEN d.asset_id IS NULL THEN NULL ELSE '/api/v1/public/media/' || d.asset_id::text END
              ) ORDER BY dds.sort_order, d.sort_order) FILTER (WHERE d.id IS NOT NULL), '[]') AS documents
       FROM download_competitions dc
       JOIN competitions c ON c.id = dc.competition_id
       LEFT JOIN download_document_settings dds ON dds.download_competition_id = dc.id AND dds.is_visible = true
       LEFT JOIN competition_documents d ON d.id = dds.document_id AND d.competition_id = dc.competition_id AND d.is_active = true
       WHERE dc.event_site_id = $1 AND dc.is_active = true
         AND c.publication_status = 'published' AND c.deleted_at IS NULL
       GROUP BY dc.id, c.slug, c.name, c.short_name
       ORDER BY dc.is_default DESC, dc.sort_order, dc.id`,
        [site.id],
      ),
      this.sites.manager.query<Array<Record<string, unknown>>>(
        `SELECT is_active AS "isActive",eyebrow,title,description,alignment FROM page_settings WHERE event_site_id=$1 AND page_type='download'`,
        [site.id],
      ),
    ]);
    return {
      data: {
        site: this.siteDto(site),
        page: pages[0] ?? null,
        competitions,
      },
      errors: [],
    };
  }

  async faq(siteSlug: string) {
    const site = await this.requirePublicSite(siteSlug);
    const [categories, pages] = await Promise.all([
      this.sites.manager.query<Array<{ title: string; questions: unknown }>>(
        `SELECT category.title,
              COALESCE(jsonb_agg(jsonb_build_object(
                'question', question.question,
                'answer', question.answer
              ) ORDER BY question.sort_order, question.id) FILTER (WHERE question.id IS NOT NULL), '[]') AS questions
       FROM faq_categories category
       LEFT JOIN faq_questions question ON question.category_id = category.id AND question.is_active = true
       WHERE category.event_site_id = $1 AND category.is_active = true
       GROUP BY category.id
       ORDER BY category.sort_order, category.id`,
        [site.id],
      ),
      this.sites.manager.query<Array<Record<string, unknown>>>(
        `SELECT is_active AS "isActive",eyebrow,title,description,alignment FROM page_settings WHERE event_site_id=$1 AND page_type='faq'`,
        [site.id],
      ),
    ]);
    return {
      data: { site: this.siteDto(site), page: pages[0] ?? null, categories },
      errors: [],
    };
  }

  async winners(siteSlug: string) {
    const site = await this.requirePublicSite(siteSlug);
    const [competition, pageRows, settingRows, archives] = await Promise.all([
      this.publicCompetition(site.id, 'current'),
      this.sites.manager.query<Array<Record<string, unknown>>>(
        `SELECT is_active AS "isActive",eyebrow,title,description,alignment FROM page_settings WHERE event_site_id=$1 AND page_type='winners'`,
        [site.id],
      ),
      this.sites.manager.query<Array<Record<string, unknown>>>(
        `SELECT is_active AS "isActive",show_decree AS "showDecree",metadata_visibility AS "metadataVisibility",archive_active AS "archiveActive",archive_limit AS "archiveLimit" FROM winner_page_settings WHERE event_site_id=$1`,
        [site.id],
      ),
      this.sites.manager.query<Array<Record<string, unknown>>>(
        `SELECT CASE WHEN competition.event_site_id=$1 THEN competition.slug ELSE owner_site.slug || '-' || competition.slug END AS slug,
                competition.name,competition.description,competition.fallback_icon AS icon
         FROM competitions competition
         JOIN event_sites owner_site ON owner_site.id=competition.event_site_id
         LEFT JOIN event_site_archive_sources source
           ON source.event_site_id=$1 AND source.source_event_site_id=competition.event_site_id
         WHERE ((competition.event_site_id=$1 AND competition.lifecycle='archived') OR source.source_event_site_id IS NOT NULL)
           AND competition.publication_status='published' AND competition.deleted_at IS NULL
           AND EXISTS (
             SELECT 1
               FROM winner_categories category
               JOIN winners winner
                 ON winner.category_id=category.id
                AND winner.competition_id=category.competition_id
              WHERE category.competition_id=competition.id
                AND category.is_active=true
                AND winner.is_active=true
           )
         ORDER BY competition.published_at DESC NULLS LAST,competition.sort_order,competition.id`,
        [site.id],
      ),
    ]);
    const settings = settingRows[0] ?? {};
    const limit = Number(settings.archiveLimit ?? 3);
    if (!competition)
      return {
        data: {
          site: this.siteDto(site),
          competition: null,
          categories: [],
          page: pageRows[0] ?? null,
          settings,
          decree: null,
          archives: archives.slice(0, limit),
        },
        errors: [],
      };
    const [categories, decreeRows] = await Promise.all([
      this.winnerCategories(competition.id),
      this.sites.manager.query<Array<Record<string, unknown>>>(
        `SELECT COALESCE(NULLIF(settings.decree_title,''),document.title,'SK Penetapan Pemenang') AS title,
                COALESCE(NULLIF(settings.decree_description,''),'Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah.') AS description,
                document.id AS "documentId",document.file_type AS "fileType",document.display_size AS "displaySize",
                CASE WHEN document.asset_id IS NULL THEN NULL ELSE '/api/v1/public/media/' || document.asset_id::text END AS url
           FROM competition_detail_settings settings
           LEFT JOIN competition_documents document
             ON document.id=settings.decree_document_id
            AND document.competition_id=settings.competition_id
          WHERE settings.competition_id=$1`,
        [competition.id],
      ),
    ]);
    return {
      data: {
        site: this.siteDto(site),
        competition,
        categories,
        page: pageRows[0] ?? null,
        settings,
        decree: decreeRows[0] ?? null,
        archives: archives.slice(0, limit),
      },
      errors: [],
    };
  }

  async archives(siteSlug: string) {
    const site = await this.requirePublicSite(siteSlug);
    const [competitions, pages] = await Promise.all([
      this.sites.manager.query<Array<Record<string, unknown>>>(
        `SELECT CASE WHEN competition.event_site_id=$1 THEN competition.slug ELSE owner_site.slug || '-' || competition.slug END AS slug,
                competition.name,competition.short_name AS "shortName",competition.description,
                competition.fallback_icon AS "fallbackIcon",competition.mascot_asset_id AS "mascotAssetId"
         FROM competitions competition
         JOIN event_sites owner_site ON owner_site.id=competition.event_site_id
         LEFT JOIN event_site_archive_sources source
           ON source.event_site_id=$1 AND source.source_event_site_id=competition.event_site_id
         WHERE ((competition.event_site_id=$1 AND competition.lifecycle='archived') OR source.source_event_site_id IS NOT NULL)
           AND competition.publication_status='published' AND competition.deleted_at IS NULL
         ORDER BY competition.published_at DESC NULLS LAST,competition.sort_order,competition.id`,
        [site.id],
      ),
      this.sites.manager.query<Array<Record<string, unknown>>>(
        `SELECT is_active AS "isActive",eyebrow,title,description,alignment FROM page_settings WHERE event_site_id=$1 AND page_type='archive'`,
        [site.id],
      ),
    ]);
    return {
      data: { site: this.siteDto(site), page: pages[0] ?? null, competitions },
      errors: [],
    };
  }

  async archiveDetail(siteSlug: string, competitionSlug: string) {
    const site = await this.requirePublicSite(siteSlug);
    const competition = await this.publicCompetition(
      site.id,
      'archived',
      competitionSlug,
    );
    if (!competition)
      throw new NotFoundException('Published archive not found');
    const [categories, documents, settingRows] = await Promise.all([
      this.winnerCategories(competition.id),
      this.sites.manager.query<Array<Record<string, unknown>>>(
        `SELECT d.id,d.title, d.category, d.document_role AS "documentRole", d.file_type AS "fileType", d.display_size AS "displaySize", d.asset_id AS "assetId", CASE WHEN d.asset_id IS NULL THEN NULL ELSE '/api/v1/public/media/' || d.asset_id::text END AS url
         FROM competition_documents d
         LEFT JOIN archive_document_settings setting ON setting.document_id = d.id AND setting.competition_id = d.competition_id
         WHERE d.competition_id = $1 AND d.is_active = true AND COALESCE(setting.is_visible, true) = true
         ORDER BY COALESCE(setting.sort_order, d.sort_order), d.id`,
        [competition.id],
      ),
      this.sites.manager.query<Array<Record<string, unknown>>>(
        `SELECT decree_document_id AS "decreeDocumentId",decree_title AS "decreeTitle",decree_description AS "decreeDescription",is_active AS "isActive",winners_active AS "winnersActive",documents_active AS "documentsActive",metadata_visibility AS "metadataVisibility" FROM competition_detail_settings WHERE competition_id=$1`,
        [competition.id],
      ),
    ]);
    const publicCompetition = {
      slug: competition.slug,
      name: competition.name,
      shortName: competition.shortName,
      description: competition.description,
      fallbackIcon: competition.fallbackIcon,
      mascotAssetId: competition.mascotAssetId,
    };
    return {
      data: {
        site: this.siteDto(site),
        competition: publicCompetition,
        settings: settingRows[0] ?? null,
        categories,
        documents,
      },
      errors: [],
    };
  }

  private async publicCompetition(
    siteId: string,
    lifecycle: 'current' | 'archived',
    slug?: string,
  ) {
    const rows = await this.sites.manager.query<
      Array<{
        id: string;
        slug: string;
        name: string;
        shortName: string;
        description: string;
        fallbackIcon: string;
        mascotAssetId: string | null;
      }>
    >(
      lifecycle === 'current'
        ? `SELECT id,slug,name,short_name AS "shortName",description,fallback_icon AS "fallbackIcon",mascot_asset_id AS "mascotAssetId"
           FROM competitions
           WHERE event_site_id=$1 AND lifecycle='current'
             AND publication_status='published' AND deleted_at IS NULL
             AND ($2::varchar IS NULL OR slug=$2)
           ORDER BY sort_order,id LIMIT 1`
        : `SELECT competition.id,
                  CASE WHEN competition.event_site_id=$1 THEN competition.slug ELSE owner_site.slug || '-' || competition.slug END AS slug,
                  competition.name,competition.short_name AS "shortName",competition.description,
                  competition.fallback_icon AS "fallbackIcon",competition.mascot_asset_id AS "mascotAssetId"
           FROM competitions competition
           JOIN event_sites owner_site ON owner_site.id=competition.event_site_id
           LEFT JOIN event_site_archive_sources source
             ON source.event_site_id=$1 AND source.source_event_site_id=competition.event_site_id
           WHERE ((competition.event_site_id=$1 AND competition.lifecycle='archived') OR source.source_event_site_id IS NOT NULL)
             AND competition.publication_status='published' AND competition.deleted_at IS NULL
             AND ($2::varchar IS NULL OR CASE WHEN competition.event_site_id=$1 THEN competition.slug ELSE owner_site.slug || '-' || competition.slug END=$2)
           ORDER BY competition.published_at DESC NULLS LAST,competition.sort_order,competition.id LIMIT 1`,
      [siteId, slug ?? null],
    );
    return rows[0] ?? null;
  }

  private winnerCategories(competitionId: string) {
    return this.sites.manager.query<Array<{ name: string; winners: unknown }>>(
      `SELECT category.name, category.rank_prefix AS "rankPrefix", category.icon,
              COALESCE(jsonb_agg(jsonb_build_object(
                'rankLabel', winner.rank_label,
                'fullName', winner.full_name,
                'school', winner.school,
                'examNumber', winner.exam_number,
                'regency', winner.regency,
                'province', winner.province,
                'photoAssetId', winner.photo_asset_id,
                'photoUrl', CASE WHEN winner.photo_asset_id IS NULL THEN NULL ELSE '/api/v1/public/media/' || winner.photo_asset_id::text END
              ) ORDER BY winner.sort_order, winner.id) FILTER (WHERE winner.id IS NOT NULL), '[]') AS winners
       FROM winner_categories category
       LEFT JOIN winners winner ON winner.category_id = category.id
         AND winner.competition_id = category.competition_id AND winner.is_active = true
       LEFT JOIN archive_category_settings setting ON setting.category_id = category.id
         AND setting.competition_id = category.competition_id
       WHERE category.competition_id = $1 AND category.is_active = true
         AND COALESCE(setting.is_visible, true) = true
       GROUP BY category.id, setting.sort_order
       ORDER BY COALESCE(setting.sort_order, category.sort_order), category.id`,
      [competitionId],
    );
  }

  private async requirePublicSite(siteSlug: string) {
    const site = await this.publicSiteQuery()
      .andWhere('site.slug = :siteSlug', { siteSlug })
      .getRawOne<PublicSiteRow>();
    if (!site) throw new NotFoundException('Published site not found');
    return site;
  }

  private publicSiteQuery() {
    return this.sites
      .createQueryBuilder('site')
      .select([
        'site.id AS "id"',
        'site.name AS "name"',
        'site.slug AS "slug"',
        'site.organizer_name AS "organizerName"',
        'site.logo_asset_id AS "logoAssetId"',
        'settings.primary_color AS "primaryColor"',
        'settings.navigation AS "navigation"',
        'settings.contact AS "contact"',
        'settings.footer AS "footer"',
        'settings.seo AS "seo"',
      ])
      .innerJoin(
        'organizations',
        'organization',
        'organization.id = site.organization_id',
      )
      .leftJoin('site_settings', 'settings', 'settings.event_site_id = site.id')
      .where("site.status = 'active'")
      .andWhere("site.publication_status = 'published'")
      .andWhere('site.deleted_at IS NULL')
      .andWhere("organization.status = 'active'")
      .andWhere('organization.deleted_at IS NULL');
  }

  private siteDto(site: PublicSiteRow) {
    return {
      name: site.name,
      slug: site.slug,
      organizerName: site.organizerName,
      logoAssetId: site.logoAssetId,
      logoUrl: site.logoAssetId
        ? `/api/v1/public/media/${site.logoAssetId}`
        : null,
    };
  }

  private settingsDto(site: PublicSiteRow) {
    return {
      primaryColor: site.primaryColor ?? '#1e4b8c',
      navigation: site.navigation ?? {},
      contact: site.contact ?? {},
      footer: site.footer ?? {},
      seo: site.seo ?? {},
    };
  }
}
