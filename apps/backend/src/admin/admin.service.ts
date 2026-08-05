import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { Competition } from '../entities/competition.entity';
import { EventSite } from '../entities/event-site.entity';

interface NewCompetition {
  name: string;
  slug: string;
  lifecycle: 'current' | 'archived';
}

interface NewSite {
  name: string;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(EventSite) private readonly sites: Repository<EventSite>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async session(userId: string, email: string) {
    const organizations = await this.dataSource.query<
      { id: string; name: string; role: string }[]
    >(
      `SELECT organization.id,organization.name,membership.role
       FROM organizations organization
       JOIN organization_memberships membership ON membership.organization_id=organization.id
       WHERE membership.user_id=$1 AND organization.status='active' AND organization.deleted_at IS NULL
       ORDER BY organization.name`,
      [userId],
    );
    const sites = await this.sites
      .createQueryBuilder('site')
      .select([
        'site.id AS "id"',
        'site.organization_id AS "organizationId"',
        'site.name AS "name"',
        'site.slug AS "slug"',
        'site.publication_status AS "publicationStatus"',
        'site.published_at AS "publishedAt"',
        'organization.name AS "organizationName"',
        'membership.role AS "role"',
        'currentCompetition.id AS "currentCompetitionId"',
        'currentCompetition.name AS "currentCompetitionName"',
        'currentCompetition.publication_status AS "currentPublicationStatus"',
        'primaryDomain.hostname AS "hostname"',
      ])
      .innerJoin(
        'organizations',
        'organization',
        'organization.id = site.organization_id',
      )
      .innerJoin(
        'organization_memberships',
        'membership',
        'membership.organization_id = organization.id',
      )
      .leftJoin(
        'competitions',
        'currentCompetition',
        "currentCompetition.event_site_id = site.id AND currentCompetition.lifecycle = 'current' AND currentCompetition.deleted_at IS NULL",
      )
      .leftJoin(
        'site_domains',
        'primaryDomain',
        'primaryDomain.event_site_id = site.id AND primaryDomain.is_primary = true',
      )
      .where('membership.user_id = :userId', { userId })
      .andWhere("site.status = 'active'")
      .andWhere('site.deleted_at IS NULL')
      .andWhere("organization.status = 'active'")
      .andWhere('organization.deleted_at IS NULL')
      .orderBy('organization.name', 'ASC')
      .addOrderBy('site.name', 'ASC')
      .getRawMany<{
        id: string;
        organizationId: string;
        name: string;
        slug: string;
        publicationStatus: string;
        publishedAt: Date | null;
        organizationName: string;
        role: string;
        currentCompetitionId: string | null;
        currentCompetitionName: string | null;
        currentPublicationStatus: string | null;
        hostname: string | null;
      }>();
    return {
      data: { user: { id: userId, email }, organizations, sites },
      errors: [],
    };
  }

  async createSite(userId: string, input: NewSite) {
    return this.dataSource.transaction(async (manager) => {
      const memberships = await manager.query<
        { organizationId: string; organizationName: string; role: string }[]
      >(
        `SELECT organization.id AS "organizationId",organization.name AS "organizationName",membership.role
         FROM organization_memberships membership
         JOIN organizations organization ON organization.id=membership.organization_id
         WHERE membership.user_id=$1
           AND membership.role IN ('owner','admin')
           AND organization.status='active' AND organization.deleted_at IS NULL
         ORDER BY CASE membership.role WHEN 'owner' THEN 0 ELSE 1 END,organization.name
         LIMIT 1`,
        [userId],
      );
      if (!memberships[0])
        throw new ForbiddenException('Organization access denied');

      const membership = memberships[0];
      const provisionalSlug = `event-${randomUUID().slice(0, 12)}`;

      const site = await manager.save(
        manager.create(EventSite, {
          organizationId: membership.organizationId,
          name: input.name.trim(),
          slug: provisionalSlug,
          organizerName: membership.organizationName,
          status: 'active',
        }),
      );
      await manager.query(
        `INSERT INTO site_settings(event_site_id) VALUES($1)`,
        [site.id],
      );
      const competition = await manager.save(
        manager.create(Competition, {
          eventSiteId: site.id,
          name: input.name.trim(),
          slug: 'current',
          lifecycle: 'current',
          publicationStatus: 'draft',
        }),
      );
      await manager.query(
        `INSERT INTO event_site_archive_sources(event_site_id,source_event_site_id,organization_id)
         SELECT $1,previous.id,$2 FROM event_sites previous
         WHERE previous.organization_id=$2 AND previous.id<>$1 AND previous.deleted_at IS NULL
         ON CONFLICT DO NOTHING`,
        [site.id, membership.organizationId],
      );
      await manager.query(
        `UPDATE competitions competition SET publication_status='published',published_at=COALESCE(published_at,now()),version=version+1,updated_at=now()
         FROM event_site_archive_sources source
         WHERE source.event_site_id=$1 AND source.source_event_site_id=competition.event_site_id
           AND competition.lifecycle='current' AND competition.deleted_at IS NULL
           AND competition.publication_status='draft'`,
        [site.id],
      );
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes)
         VALUES($1,$2,'create','event_site',$1,$3),($1,$2,'create','competition',$4,$5)`,
        [
          site.id,
          userId,
          JSON.stringify({ name: site.name, provisionalSlug: site.slug }),
          competition.id,
          JSON.stringify({ name: competition.name }),
        ],
      );
      return {
        data: {
          id: site.id,
          organizationId: site.organizationId,
          name: site.name,
          slug: site.slug,
          organizerName: site.organizerName,
          role: memberships[0].role,
          currentCompetitionId: competition.id,
          currentCompetitionName: competition.name,
          currentPublicationStatus: competition.publicationStatus,
          publicationStatus: site.publicationStatus,
          hostname: null,
        },
        errors: [],
      };
    });
  }

  async deleteSite(siteId: string, userId: string) {
    await this.authorizedSite(siteId, userId, ['owner', 'admin']);
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes)
         VALUES($1,$2,'delete','event_site',$1,$3)`,
        [siteId, userId, JSON.stringify({ softDelete: true })],
      );
      await manager.query(
        `UPDATE event_sites SET status='suspended',deleted_at=now(),updated_at=now() WHERE id=$1`,
        [siteId],
      );
    });
    return { data: { id: siteId, deleted: true }, errors: [] };
  }

  async publishSite(siteId: string, userId: string) {
    await this.authorizedSite(siteId, userId, ['owner', 'admin']);
    return this.dataSource.transaction(async (manager) => {
      const sites = await manager.query<
        { id: string; slug: string; publicationStatus: string }[]
      >(
        `SELECT id,slug,publication_status AS "publicationStatus" FROM event_sites WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`,
        [siteId],
      );
      const site = sites[0];
      if (!site) throw new ForbiddenException('Site access denied');
      if (site.slug.startsWith('event-'))
        throw new BadRequestException(
          'Atur slug/subdomain di Pengaturan Event sebelum publikasi',
        );
      const hostname = `${site.slug}.${this.publicBaseDomain()}`;
      const hostnameOwner = await manager.query<{ eventSiteId: string }[]>(
        `SELECT event_site_id AS "eventSiteId" FROM site_domains WHERE hostname=$1`,
        [hostname],
      );
      if (hostnameOwner[0] && hostnameOwner[0].eventSiteId !== siteId)
        throw new ConflictException('Subdomain sudah dipakai event lain');
      const competitions = await manager.query<{ id: string }[]>(
        `SELECT id FROM competitions WHERE event_site_id=$1 AND lifecycle='current' AND deleted_at IS NULL FOR UPDATE`,
        [siteId],
      );
      const primaryDomains = await manager.query<{ id: string }[]>(
        `SELECT id FROM site_domains WHERE event_site_id=$1 AND is_primary=true LIMIT 1`,
        [siteId],
      );
      if (primaryDomains[0]) {
        await manager.query(
          `UPDATE site_domains SET hostname=$2,verified_at=now() WHERE id=$1`,
          [primaryDomains[0].id, hostname],
        );
      } else {
        await manager.query(
          `INSERT INTO site_domains(event_site_id,hostname,is_primary,verified_at) VALUES($1,$2,true,now())`,
          [siteId, hostname],
        );
      }
      if (competitions[0])
        await manager.query(
          `UPDATE competitions SET publication_status='published',published_at=COALESCE(published_at,now()),version=version+1,updated_at=now()
           WHERE id=$1`,
          [competitions[0].id],
        );
      await manager.query(
        `UPDATE event_sites SET publication_status='published',published_at=COALESCE(published_at,now()),updated_at=now() WHERE id=$1`,
        [siteId],
      );
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes)
         VALUES($1,$2,'publish','event_site',$1,$3)`,
        [siteId, userId, JSON.stringify({ hostname })],
      );
      return {
        data: {
          id: siteId,
          publicationStatus: 'published',
          hostname,
          publicUrl: `https://${hostname}/`,
        },
        errors: [],
      };
    });
  }

  async unpublishSite(siteId: string, userId: string) {
    await this.authorizedSite(siteId, userId, ['owner', 'admin']);
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE event_sites SET publication_status='unpublished',updated_at=now() WHERE id=$1`,
        [siteId],
      );
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes)
         VALUES($1,$2,'unpublish','event_site',$1,$3)`,
        [siteId, userId, JSON.stringify({ publicationStatus: 'unpublished' })],
      );
    });
    return {
      data: { id: siteId, publicationStatus: 'unpublished' },
      errors: [],
    };
  }

  async createEdition(
    siteId: string,
    userId: string,
    input: { name: string; slug: string },
  ) {
    await this.authorizedSite(siteId, userId, ['owner', 'admin', 'editor']);
    return this.dataSource.transaction(async (manager) => {
      const duplicate = await manager.query<{ id: string }[]>(
        `SELECT id FROM competitions WHERE event_site_id=$1 AND slug=$2 AND deleted_at IS NULL`,
        [siteId, input.slug],
      );
      if (duplicate[0])
        throw new ConflictException('Edition slug already used in this portal');

      const previous = await manager.query<{ id: string; name: string }[]>(
        `SELECT id,name FROM competitions
         WHERE event_site_id=$1 AND lifecycle='current' AND deleted_at IS NULL
         FOR UPDATE`,
        [siteId],
      );
      await manager.query(
        `UPDATE competitions SET lifecycle='archived',version=version+1,updated_at=now()
         WHERE event_site_id=$1 AND lifecycle='current' AND deleted_at IS NULL`,
        [siteId],
      );
      const competition = await manager.save(
        manager.create(Competition, {
          eventSiteId: siteId,
          name: input.name.trim(),
          slug: input.slug,
          lifecycle: 'current',
          publicationStatus: 'draft',
        }),
      );
      for (const old of previous) {
        await manager.query(
          `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes)
           VALUES($1,$2,'archive','competition',$3,$4)`,
          [siteId, userId, old.id, JSON.stringify({ lifecycle: 'archived' })],
        );
      }
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes)
         VALUES($1,$2,'create','competition',$3,$4)`,
        [
          siteId,
          userId,
          competition.id,
          JSON.stringify({ name: competition.name, slug: competition.slug }),
        ],
      );
      return {
        data: {
          id: competition.id,
          name: competition.name,
          slug: competition.slug,
          lifecycle: competition.lifecycle,
          publicationStatus: competition.publicationStatus,
          archivedCompetitionIds: previous.map((item) => item.id),
        },
        errors: [],
      };
    });
  }

  async site(siteId: string, userId: string) {
    const site = await this.authorizedSite(siteId, userId);
    return {
      data: {
        id: site.id,
        name: site.name,
        slug: site.slug,
        organizerName: site.organizerName,
        logoAssetId: site.logoAssetId,
        status: site.status,
        updatedAt: site.updatedAt,
      },
      errors: [],
    };
  }

  async settings(siteId: string, userId: string) {
    const site = await this.authorizedSite(siteId, userId);
    const [rows, competitions] = await Promise.all([
      this.dataSource.query<
        Array<{
          primaryColor: string;
          navigation: Record<string, boolean>;
          contact: Record<string, string>;
          footer: Record<string, string>;
        }>
      >(
        `SELECT primary_color AS "primaryColor",navigation,contact,footer FROM site_settings WHERE event_site_id=$1`,
        [siteId],
      ),
      this.dataSource.query<Array<{ description: string }>>(
        `SELECT description FROM competitions WHERE event_site_id=$1 AND lifecycle='current' AND deleted_at IS NULL LIMIT 1`,
        [siteId],
      ),
    ]);
    return {
      data: {
        eventName: site.name,
        eventDescription: competitions[0]?.description ?? '',
        eventSlug: site.slug,
        organizerName: site.organizerName,
        logoAssetId: site.logoAssetId,
        logoUrl: site.logoAssetId
          ? `/api/v1/public/media/${site.logoAssetId}`
          : null,
        primaryColor: rows[0]?.primaryColor ?? '#1e4b8c',
        navigation: rows[0]?.navigation ?? {},
        contact: rows[0]?.contact ?? {},
        footer: rows[0]?.footer ?? {},
      },
      errors: [],
    };
  }

  async putSettings(
    siteId: string,
    userId: string,
    input: {
      eventName: string;
      eventDescription?: string;
      eventSlug: string;
      organizerName: string;
      primaryColor: string;
      logoAssetId?: string;
      navigation: Record<string, boolean>;
      contact: Record<string, string>;
      footer: Record<string, string>;
    },
  ) {
    await this.authorizedSite(siteId, userId, ['owner', 'admin', 'editor']);
    await this.dataSource.transaction(async (manager) => {
      const currentSiteRows = await manager.query<
        { slug: string; publicationStatus: string }[]
      >(
        `SELECT slug,publication_status AS "publicationStatus" FROM event_sites WHERE id=$1 FOR UPDATE`,
        [siteId],
      );
      const currentSite = currentSiteRows[0];
      if (
        currentSite?.publicationStatus === 'published' &&
        currentSite.slug !== input.eventSlug
      )
        throw new BadRequestException(
          'Nonaktifkan event sebelum mengganti slug/subdomain',
        );
      const duplicateSlug = await manager.query<{ id: string }[]>(
        `SELECT other.id FROM event_sites current_site
         JOIN event_sites other ON other.organization_id=current_site.organization_id
         WHERE current_site.id=$1 AND other.id<>$1 AND other.slug=$2 AND other.deleted_at IS NULL`,
        [siteId, input.eventSlug],
      );
      if (duplicateSlug[0])
        throw new ConflictException('Slug/subdomain sudah dipakai event lain');
      const hostname = `${input.eventSlug}.${this.publicBaseDomain()}`;
      const duplicateDomain = await manager.query<{ id: string }[]>(
        `SELECT id FROM site_domains WHERE hostname=$1 AND event_site_id<>$2`,
        [hostname, siteId],
      );
      if (duplicateDomain[0])
        throw new ConflictException('Subdomain sudah dipakai event lain');
      if (input.logoAssetId) {
        const owned = await manager.query<Array<{ id: string }>>(
          `SELECT asset.id FROM media_assets asset JOIN event_sites site ON site.organization_id=asset.organization_id WHERE asset.id=$1 AND site.id=$2 AND asset.status='active'`,
          [input.logoAssetId, siteId],
        );
        if (!owned[0]) throw new BadRequestException('Invalid logo asset');
      }
      await manager.query(
        `UPDATE event_sites SET name=$2,organizer_name=$3,logo_asset_id=$4,slug=$5,updated_at=now() WHERE id=$1`,
        [
          siteId,
          input.eventName.trim(),
          input.organizerName.trim(),
          input.logoAssetId ?? null,
          input.eventSlug,
        ],
      );
      await manager.query(
        `UPDATE competitions SET name=$2,short_name=$2,description=$3,updated_at=now(),version=version+1 WHERE event_site_id=$1 AND lifecycle='current' AND deleted_at IS NULL`,
        [
          siteId,
          input.eventName.trim(),
          input.eventDescription?.trim() ?? '',
        ],
      );
      await manager.query(
        `UPDATE site_domains SET hostname=$2,verified_at=now() WHERE event_site_id=$1 AND is_primary=true`,
        [siteId, hostname],
      );
      await manager.query(
        `INSERT INTO site_settings(event_site_id,primary_color,navigation,contact,footer) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_site_id) DO UPDATE SET primary_color=EXCLUDED.primary_color,navigation=EXCLUDED.navigation,contact=EXCLUDED.contact,footer=EXCLUDED.footer`,
        [
          siteId,
          input.primaryColor,
          input.navigation,
          input.contact,
          input.footer,
        ],
      );
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes) VALUES($1,$2,'update','site_settings',$1,$3)`,
        [siteId, userId, JSON.stringify(input)],
      );
    });
    return this.settings(siteId, userId);
  }

  async faq(siteId: string, userId: string) {
    await this.authorizedSite(siteId, userId);
    const rows = await this.dataSource.query<
      {
        id: string;
        title: string;
        active: boolean;
        sortOrder: number;
        questions: {
          id: string;
          question: string;
          answer: string;
          active: boolean;
          sortOrder: number;
        }[];
      }[]
    >(
      `SELECT c.id,c.title,c.is_active AS active,c.sort_order AS "sortOrder",
       COALESCE(jsonb_agg(jsonb_build_object('id',q.id,'question',q.question,'answer',q.answer,'active',q.is_active,'sortOrder',q.sort_order) ORDER BY q.sort_order,q.id) FILTER (WHERE q.id IS NOT NULL),'[]') AS questions
       FROM faq_categories c LEFT JOIN faq_questions q ON q.category_id=c.id
       WHERE c.event_site_id=$1 GROUP BY c.id ORDER BY c.sort_order,c.id`,
      [siteId],
    );
    return { data: { categories: rows }, errors: [] };
  }

  async putFaq(
    siteId: string,
    userId: string,
    categories: {
      id?: string;
      title: string;
      active: boolean;
      questions: {
        id?: string;
        question: string;
        answer: string;
        active: boolean;
      }[];
    }[],
  ) {
    await this.authorizedSite(siteId, userId, ['owner', 'admin', 'editor']);
    await this.dataSource.transaction(async (manager) => {
      await manager.query(`DELETE FROM faq_categories WHERE event_site_id=$1`, [
        siteId,
      ]);
      for (const [categoryOrder, category] of categories.entries()) {
        const categoryRows = await manager.query<{ id: string }[]>(
          `INSERT INTO faq_categories(id,event_site_id,title,is_active,sort_order) VALUES(COALESCE($1,gen_random_uuid()),$2,$3,$4,$5) RETURNING id`,
          [
            category.id ?? null,
            siteId,
            category.title.trim(),
            category.active,
            categoryOrder,
          ],
        );
        for (const [questionOrder, question] of category.questions.entries()) {
          await manager.query(
            `INSERT INTO faq_questions(id,category_id,question,answer,is_active,sort_order) VALUES(COALESCE($1,gen_random_uuid()),$2,$3,$4,$5,$6)`,
            [
              question.id ?? null,
              categoryRows[0].id,
              question.question.trim(),
              question.answer.trim(),
              question.active,
              questionOrder,
            ],
          );
        }
      }
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes) VALUES($1,$2,'update','faq',$1,$3)`,
        [siteId, userId, JSON.stringify({ categoryCount: categories.length })],
      );
    });
    return this.faq(siteId, userId);
  }

  async downloads(siteId: string, userId: string) {
    await this.authorizedSite(siteId, userId);
    const rows = await this.dataSource.query<
      {
        competitionId: string;
        customTabName: string;
        isDefault: boolean;
        isActive: boolean;
        sortOrder: number;
        documents: {
          documentId: string;
          isVisible: boolean;
          labelOverride: string;
          sortOrder: number;
        }[];
      }[]
    >(
      `SELECT dc.competition_id AS "competitionId",dc.custom_tab_name AS "customTabName",dc.is_default AS "isDefault",dc.is_active AS "isActive",dc.sort_order AS "sortOrder",
       COALESCE(jsonb_agg(jsonb_build_object('documentId',dds.document_id,'isVisible',dds.is_visible,'labelOverride',dds.label_override,'sortOrder',dds.sort_order) ORDER BY dds.sort_order,dds.document_id) FILTER (WHERE dds.document_id IS NOT NULL),'[]') AS documents
       FROM download_competitions dc LEFT JOIN download_document_settings dds ON dds.download_competition_id=dc.id
       WHERE dc.event_site_id=$1 GROUP BY dc.id ORDER BY dc.sort_order,dc.id`,
      [siteId],
    );
    return { data: { competitions: rows }, errors: [] };
  }

  async putDownloads(
    siteId: string,
    userId: string,
    competitions: {
      competitionId: string;
      customTabName: string;
      isDefault: boolean;
      isActive: boolean;
      documents: {
        documentId: string;
        isVisible: boolean;
        labelOverride: string;
      }[];
    }[],
  ) {
    await this.authorizedSite(siteId, userId, ['owner', 'admin', 'editor']);
    if (competitions.filter((item) => item.isDefault).length > 1)
      throw new BadRequestException(
        'Only one default download competition is allowed',
      );
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `DELETE FROM download_competitions WHERE event_site_id=$1`,
        [siteId],
      );
      for (const [competitionOrder, competition] of competitions.entries()) {
        const owned = await manager.query<{ id: string }[]>(
          `SELECT competition.id
             FROM competitions competition
             LEFT JOIN event_site_archive_sources source
               ON source.event_site_id=$2
              AND source.source_event_site_id=competition.event_site_id
            WHERE competition.id=$1
              AND competition.deleted_at IS NULL
              AND (
                (competition.event_site_id=$2 AND competition.lifecycle='current')
                OR (source.source_event_site_id IS NOT NULL AND competition.publication_status='published')
              )`,
          [competition.competitionId, siteId],
        );
        if (!owned[0])
          throw new BadRequestException(
            'Download source must be the current competition or an inherited published archive',
          );
        const rows = await manager.query<{ id: string }[]>(
          `INSERT INTO download_competitions(event_site_id,competition_id,custom_tab_name,is_default,is_active,sort_order) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
          [
            siteId,
            competition.competitionId,
            competition.customTabName.trim(),
            competition.isDefault,
            competition.isActive,
            competitionOrder,
          ],
        );
        for (const [
          documentOrder,
          document,
        ] of competition.documents.entries()) {
          const documentOwned = await manager.query<{ id: string }[]>(
            `SELECT id FROM competition_documents WHERE id=$1 AND competition_id=$2`,
            [document.documentId, competition.competitionId],
          );
          if (!documentOwned[0])
            throw new BadRequestException(
              'Download document does not belong to its competition',
            );
          await manager.query(
            `INSERT INTO download_document_settings(download_competition_id,document_id,competition_id,is_visible,label_override,sort_order) VALUES($1,$2,$3,$4,$5,$6)`,
            [
              rows[0].id,
              document.documentId,
              competition.competitionId,
              document.isVisible,
              document.labelOverride.trim(),
              documentOrder,
            ],
          );
        }
      }
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes) VALUES($1,$2,'update','downloads',$1,$3)`,
        [
          siteId,
          userId,
          JSON.stringify({ competitionCount: competitions.length }),
        ],
      );
    });
    return this.downloads(siteId, userId);
  }

  async home(siteId: string, userId: string) {
    await this.authorizedSite(siteId, userId);
    const rows = await this.dataSource.query<
      {
        sectionType: string;
        isActive: boolean;
        sortOrder: number;
        settings: Record<string, unknown>;
      }[]
    >(
      `SELECT section_type AS "sectionType",is_active AS "isActive",sort_order AS "sortOrder",settings FROM home_sections WHERE event_site_id=$1 ORDER BY sort_order,id`,
      [siteId],
    );
    return { data: { sections: rows }, errors: [] };
  }

  async putHome(
    siteId: string,
    userId: string,
    sections: {
      sectionType: string;
      isActive: boolean;
      settings: Record<string, unknown>;
    }[],
  ) {
    await this.authorizedSite(siteId, userId, ['owner', 'admin', 'editor']);
    if (
      new Set(sections.map((section) => section.sectionType)).size !==
      sections.length
    )
      throw new BadRequestException('Home section types must be unique');
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `DELETE FROM home_sections WHERE event_site_id=$1 AND NOT(section_type=ANY($2::text[]))`,
        [siteId, sections.map((section) => section.sectionType)],
      );
      for (const [sortOrder, section] of sections.entries()) {
        await manager.query(
          `INSERT INTO home_sections(event_site_id,section_type,is_active,sort_order,settings) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_site_id,section_type) DO UPDATE SET is_active=EXCLUDED.is_active,sort_order=EXCLUDED.sort_order,settings=EXCLUDED.settings`,
          [
            siteId,
            section.sectionType,
            section.isActive,
            sortOrder,
            section.settings,
          ],
        );
      }
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes) VALUES($1,$2,'update','home_sections',$1,$3)`,
        [siteId, userId, JSON.stringify({ sectionCount: sections.length })],
      );
    });
    return this.home(siteId, userId);
  }

  async competitions(siteId: string, userId: string) {
    await this.authorizedSite(siteId, userId);
    const rows = await this.dataSource.query<
      Array<{
        id: string;
        name: string;
        shortName: string;
        slug: string;
        lifecycle: string;
        publicationStatus: string;
        description: string;
        mascotAssetId: string | null;
        fallbackIcon: string;
        sortOrder: number;
        version: number;
        updatedAt: Date;
        deletedAt: Date | null;
        inherited: boolean;
      }>
    >(
      `SELECT competition.id,competition.name,competition.short_name AS "shortName",competition.slug,
              CASE WHEN competition.event_site_id=$1 THEN competition.lifecycle ELSE 'archived' END AS lifecycle,
              competition.publication_status AS "publicationStatus",competition.description,
              competition.mascot_asset_id AS "mascotAssetId",competition.fallback_icon AS "fallbackIcon",
              competition.sort_order AS "sortOrder",competition.version,competition.updated_at AS "updatedAt",
              competition.deleted_at AS "deletedAt",(competition.event_site_id<>$1) AS inherited
       FROM competitions competition
       LEFT JOIN event_site_archive_sources source
         ON source.event_site_id=$1 AND source.source_event_site_id=competition.event_site_id
       WHERE (competition.event_site_id=$1 OR source.source_event_site_id IS NOT NULL)
       ORDER BY inherited,competition.sort_order,competition.created_at`,
      [siteId],
    );
    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        shortName: row.shortName,
        slug: row.slug,
        lifecycle: row.lifecycle,
        publicationStatus: row.publicationStatus,
        description: row.description,
        mascotAssetId: row.mascotAssetId,
        mascotUrl: row.mascotAssetId
          ? `/api/v1/public/media/${row.mascotAssetId}`
          : null,
        fallbackIcon: row.fallbackIcon,
        sortOrder: row.sortOrder,
        version: row.version,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
        inherited: row.inherited,
      })),
      errors: [],
    };
  }

  async createCompetition(
    siteId: string,
    userId: string,
    input: NewCompetition,
  ) {
    if (input.lifecycle === 'current') {
      return this.createEdition(siteId, userId, input);
    }
    await this.authorizedSite(siteId, userId, ['owner', 'admin', 'editor']);
    const competition = await this.dataSource.transaction(async (manager) => {
      const row = manager.create(Competition, {
        eventSiteId: siteId,
        name: input.name.trim(),
        slug: input.slug,
        lifecycle: input.lifecycle,
        publicationStatus: 'draft',
      });
      const saved = await manager.save(row);
      await manager.query(
        `INSERT INTO audit_logs (event_site_id, actor_user_id, action, entity_type, entity_id, changes)
         VALUES ($1, $2, 'create', 'competition', $3, $4)`,
        [
          siteId,
          userId,
          saved.id,
          JSON.stringify({ name: saved.name, slug: saved.slug }),
        ],
      );
      return saved;
    });
    return {
      data: {
        id: competition.id,
        publicationStatus: competition.publicationStatus,
      },
      errors: [],
    };
  }

  async updateCompetition(
    competitionId: string,
    userId: string,
    ifMatch: string | undefined,
    input: { name?: string; description?: string },
  ) {
    return this.mutateCompetition(
      competitionId,
      userId,
      ifMatch,
      'update',
      input,
    );
  }

  async deleteCompetition(
    competitionId: string,
    userId: string,
    ifMatch: string | undefined,
  ) {
    return this.mutateCompetition(competitionId, userId, ifMatch, 'delete', {});
  }

  async publishCompetition(
    competitionId: string,
    userId: string,
    ifMatch: string | undefined,
  ) {
    return this.mutateCompetition(
      competitionId,
      userId,
      ifMatch,
      'publish',
      {},
    );
  }

  private async mutateCompetition(
    competitionId: string,
    userId: string,
    ifMatch: string | undefined,
    action: 'update' | 'delete' | 'publish',
    input: { name?: string; description?: string; mascotAssetId?: string },
  ) {
    const expectedVersion = this.parseVersion(ifMatch);
    return this.dataSource.transaction(async (manager) => {
      const competition = await manager
        .getRepository(Competition)
        .createQueryBuilder('competition')
        .innerJoin('event_sites', 'site', 'site.id = competition.event_site_id')
        .innerJoin(
          'organization_memberships',
          'membership',
          'membership.organization_id = site.organization_id',
        )
        .where('competition.id = :competitionId', { competitionId })
        .andWhere('membership.user_id = :userId', { userId })
        .andWhere("membership.role IN ('owner', 'admin', 'editor')")
        .andWhere('competition.deleted_at IS NULL')
        .setLock('pessimistic_write')
        .getOne();
      if (!competition)
        throw new ForbiddenException('Competition access denied');
      if (competition.version !== expectedVersion) {
        throw new ConflictException('Competition was modified by another user');
      }

      if (action === 'update') {
        if (input.name !== undefined) competition.name = input.name.trim();
        if (input.description !== undefined)
          competition.description = input.description;
        if (input.mascotAssetId !== undefined) {
          const owned = await manager.query<Array<{ id: string }>>(
            `SELECT asset.id FROM media_assets asset JOIN event_sites site ON site.organization_id=asset.organization_id WHERE asset.id=$1 AND site.id=$2 AND asset.status='active'`,
            [input.mascotAssetId, competition.eventSiteId],
          );
          if (!owned[0]) throw new BadRequestException('Invalid mascot asset');
          competition.mascotAssetId = input.mascotAssetId;
        }
      } else if (action === 'delete') {
        competition.deletedAt = new Date();
        competition.publicationStatus = 'disabled';
      } else {
        competition.publicationStatus = 'published';
        competition.publishedAt = new Date();
      }
      const saved = await manager.save(competition);
      await manager.query(
        `INSERT INTO audit_logs (event_site_id, actor_user_id, action, entity_type, entity_id, changes)
         VALUES ($1, $2, $3, 'competition', $4, $5)`,
        [saved.eventSiteId, userId, action, saved.id, JSON.stringify(input)],
      );
      return {
        data: {
          id: saved.id,
          version: saved.version,
          publicationStatus: saved.publicationStatus,
        },
        errors: [],
      };
    });
  }

  private parseVersion(value: string | undefined) {
    const normalized = value?.replace(/^W\//, '').replace(/^"|"$/g, '');
    const version = Number(normalized);
    if (!Number.isInteger(version) || version < 1) {
      throw new BadRequestException('A valid If-Match version is required');
    }
    return version;
  }

  private publicBaseDomain() {
    return this.config
      .get<string>('PUBLIC_BASE_DOMAIN', 'nexaplaymetadata.online')
      .trim()
      .toLowerCase()
      .replace(/^\.+|\.+$/g, '');
  }

  private async authorizedSite(
    siteId: string,
    userId: string,
    roles?: string[],
  ) {
    const query = this.sites
      .createQueryBuilder('site')
      .innerJoin(
        'organization_memberships',
        'membership',
        'membership.organization_id = site.organization_id',
      )
      .where('site.id = :siteId', { siteId })
      .andWhere('membership.user_id = :userId', { userId })
      .andWhere('site.deleted_at IS NULL');
    if (roles) query.andWhere('membership.role IN (:...roles)', { roles });
    const site = await query.getOne();
    if (!site) throw new ForbiddenException('Site access denied');
    return site;
  }
}
