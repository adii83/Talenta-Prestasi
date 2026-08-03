import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Competition } from '../entities/competition.entity';
import { EventSite } from '../entities/event-site.entity';

interface NewCompetition {
  name: string;
  slug: string;
  lifecycle: 'current' | 'archived';
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(EventSite) private readonly sites: Repository<EventSite>,
    @InjectRepository(Competition)
    private readonly competitionRepo: Repository<Competition>,
    private readonly dataSource: DataSource,
  ) {}

  async session(userId: string, email: string) {
    const sites = await this.sites
      .createQueryBuilder('site')
      .select([
        'site.id AS "id"',
        'site.name AS "name"',
        'site.slug AS "slug"',
        'organization.name AS "organizationName"',
        'membership.role AS "role"',
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
      .where('membership.user_id = :userId', { userId })
      .andWhere("site.status = 'active'")
      .andWhere('site.deleted_at IS NULL')
      .andWhere("organization.status = 'active'")
      .andWhere('organization.deleted_at IS NULL')
      .orderBy('organization.name', 'ASC')
      .addOrderBy('site.name', 'ASC')
      .getRawMany<{
        id: string;
        name: string;
        slug: string;
        organizationName: string;
        role: string;
      }>();
    return { data: { user: { id: userId, email }, sites }, errors: [] };
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
    const rows = await this.dataSource.query<
      {
        primaryColor: string;
        navigation: Record<string, boolean>;
        contact: Record<string, string>;
        footer: Record<string, string>;
      }[]
    >(
      `SELECT primary_color AS "primaryColor",navigation,contact,footer FROM site_settings WHERE event_site_id=$1`,
      [siteId],
    );
    return {
      data: {
        eventName: site.name,
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
      if (input.logoAssetId) {
        const owned = await manager.query<Array<{ id: string }>>(
          `SELECT asset.id FROM media_assets asset JOIN event_sites site ON site.organization_id=asset.organization_id WHERE asset.id=$1 AND site.id=$2 AND asset.status='active'`,
          [input.logoAssetId, siteId],
        );
        if (!owned[0]) throw new BadRequestException('Invalid logo asset');
      }
      await manager.query(
        `UPDATE event_sites SET name=$2,organizer_name=$3,logo_asset_id=COALESCE($4,logo_asset_id),updated_at=now() WHERE id=$1`,
        [
          siteId,
          input.eventName.trim(),
          input.organizerName.trim(),
          input.logoAssetId ?? null,
        ],
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
          `SELECT id FROM competitions WHERE id=$1 AND event_site_id=$2 AND deleted_at IS NULL`,
          [competition.competitionId, siteId],
        );
        if (!owned[0])
          throw new BadRequestException(
            'Download competition does not belong to this site',
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
    const rows = await this.competitionRepo.find({
      where: { eventSiteId: siteId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
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
      })),
      errors: [],
    };
  }

  async createCompetition(
    siteId: string,
    userId: string,
    input: NewCompetition,
  ) {
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
