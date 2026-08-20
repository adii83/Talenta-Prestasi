import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CompetitionCategory } from '../entities/competition-category.entity';
import { EventSite } from '../entities/event-site.entity';

interface NewCategory {
  name: string;
  slug: string;
}

interface EventPeriodInput {
  periodYear: number;
  batchEnabled: boolean;
  batchLabel?: string;
  batchNote?: string;
  confirmBatchConversion?: boolean;
}

interface NewEvent extends EventPeriodInput {
  useLatestTemplate?: boolean;
}

interface EventTemplate {
  id: string;
  description: string;
  logoAssetId: string | null;
  mascotAssetId: string | null;
  fallbackIcon: string;
}

interface CategoryUpdate {
  name: string;
  organizerName: string;
}

interface EventUpdate {
  description?: string;
  fallbackIcon?: string;
  mascotAssetId?: string | null;
}

const EVENT_FALLBACK_ICONS = new Set([
  'archive',
  'award',
  'book-open',
  'graduation-cap',
  'medal',
  'school',
  'sparkles',
  'star',
  'trophy',
]);

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(CompetitionCategory)
    private readonly categories: Repository<CompetitionCategory>,
    @InjectRepository(EventSite)
    private readonly events: Repository<EventSite>,
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
    const cats = await this.dataSource.query<
      {
        id: string;
        organizationId: string;
        name: string;
        slug: string;
        publicationStatus: string;
        publishedAt: Date | null;
        organizationName: string;
        role: string;
        hostname: string | null;
        activeEventId: string | null;
        activeEventName: string | null;
      }[]
    >(
      `SELECT c.id,c.organization_id AS "organizationId",c.name,c.slug,
              c.publication_status AS "publicationStatus",c.published_at AS "publishedAt",
              org.name AS "organizationName",m.role,
              d.hostname,
              ae.id AS "activeEventId",ae.name AS "activeEventName"
       FROM competition_categories c
       INNER JOIN organizations org ON org.id=c.organization_id
       INNER JOIN organization_memberships m ON m.organization_id=org.id
       LEFT JOIN site_domains d ON d.category_id=c.id AND d.is_primary=true
       LEFT JOIN event_sites ae ON ae.category_id=c.id AND ae.is_active=true AND ae.deleted_at IS NULL
       WHERE m.user_id=$1 AND c.status='active' AND c.deleted_at IS NULL
         AND org.status='active' AND org.deleted_at IS NULL
       ORDER BY org.name,c.name`,
      [userId],
    );
    return {
      data: { user: { id: userId, email }, organizations, categories: cats },
      errors: [],
    };
  }

  async listCategories(userId: string) {
    const rows = await this.dataSource.query(
      `SELECT c.id,c.organization_id AS "organizationId",c.name,c.slug,
              c.organizer_name AS "organizerName",c.publication_status AS "publicationStatus",
              c.published_at AS "publishedAt",d.hostname,
              active.id AS "activeEventId",active.name AS "activeEventName"
       FROM competition_categories c
       INNER JOIN organization_memberships membership ON membership.organization_id=c.organization_id
       LEFT JOIN site_domains d ON d.category_id=c.id AND d.is_primary=true
       LEFT JOIN event_sites active ON active.category_id=c.id AND active.is_active=true AND active.deleted_at IS NULL
       WHERE membership.user_id=$1 AND c.deleted_at IS NULL
       ORDER BY c.name`,
      [userId],
    );
    return { data: rows, errors: [] };
  }

  async createCategory(userId: string, input: NewCategory) {
    return this.dataSource.transaction(async (manager) => {
      const membership = await this.userMembership(manager, userId);
      const slug = input.slug.trim().toLowerCase();
      const duplicate = await manager.query<{ id: string }[]>(
        `SELECT id FROM competition_categories WHERE organization_id=$1 AND slug=$2 AND deleted_at IS NULL`,
        [membership.organizationId, slug],
      );
      if (duplicate[0])
        throw new ConflictException('Slug sudah dipakai kategori lain');
      const category = await manager.save(
        manager.create(CompetitionCategory, {
          organizationId: membership.organizationId,
          name: input.name.trim(),
          slug,
          organizerName: membership.organizationName,
          status: 'active',
        }),
      );
      return {
        data: { id: category.id, name: category.name, slug },
        errors: [],
      };
    });
  }

  async updateCategory(
    categoryId: string,
    userId: string,
    input: CategoryUpdate,
  ) {
    return this.dataSource.transaction(async (manager) => {
      await this.authorizedCategory(manager, categoryId, userId, [
        'owner',
        'admin',
      ]);
      const rows = await manager.query<
        { id: string; name: string; organizerName: string; slug: string }[]
      >(
        `UPDATE competition_categories
         SET name=$2,organizer_name=$3,updated_at=now()
         WHERE id=$1
         RETURNING id,name,organizer_name AS "organizerName",slug`,
        [categoryId, input.name.trim(), input.organizerName.trim()],
      );
      await manager.query(
        `UPDATE event_sites SET name=$2,updated_at=now()
         WHERE category_id=$1 AND deleted_at IS NULL`,
        [categoryId, input.name.trim()],
      );
      return { data: rows[0], errors: [] };
    });
  }

  async createEvent(categoryId: string, userId: string, input: NewEvent) {
    return this.dataSource.transaction(async (manager) => {
      const category = await this.authorizedCategory(
        manager,
        categoryId,
        userId,
        ['owner', 'admin'],
      );
      const template = input.useLatestTemplate
        ? await this.latestTemplateEvent(manager, category.id)
        : null;
      if (input.useLatestTemplate && !template)
        throw new ConflictException('Template Event sebelumnya tidak tersedia');
      return this.createPeriodEvent(manager, category, userId, input, template);
    });
  }

  async setEventPeriodIdentity(
    eventId: string,
    userId: string,
    input: EventPeriodInput,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const event = await this.authorizedEvent(manager, eventId, userId, [
        'owner',
        'admin',
      ]);
      const rows = await manager.query<Array<{ periodYear: number | null }>>(
        `SELECT period_year AS "periodYear" FROM event_sites WHERE id=$1`,
        [eventId],
      );
      if (rows[0]?.periodYear !== null)
        throw new ConflictException('Identitas periode Event sudah ditetapkan');
      await manager.query(
        `SELECT id FROM competition_categories WHERE id=$1 FOR UPDATE`,
        [event.categoryId],
      );
      const identities = await this.periodEvents(
        manager,
        event.categoryId,
        input.periodYear,
      );
      const otherEvents = identities.filter((item) => item.id !== eventId);
      if (otherEvents.length)
        throw this.batchConversionConflict(otherEvents[0], input.periodYear);
      const label = input.batchEnabled
        ? this.batchLabel(input.batchLabel)
        : null;
      const batchNumber = input.batchEnabled
        ? this.nextBatchNumber(identities)
        : null;
      const slug = this.periodSlug(input.periodYear, label, batchNumber);
      const updated = await manager.query<Array<Record<string, unknown>>>(
        `UPDATE event_sites
         SET period_year=$2,batch_number=$3,batch_label=$4,batch_note=$5,slug=$6,updated_at=now()
         WHERE id=$1
         RETURNING id,name,slug,period_year AS "periodYear",batch_number AS "batchNumber",
                   batch_label AS "batchLabel",batch_note AS "batchNote",is_active AS "isActive"`,
        [
          eventId,
          input.periodYear,
          batchNumber,
          label,
          input.batchNote?.trim() ?? '',
          slug,
        ],
      );
      return { data: updated[0], errors: [] };
    });
  }

  async updateEvent(eventId: string, userId: string, input: EventUpdate) {
    return this.dataSource.transaction(async (manager) => {
      const event = await this.authorizedEvent(manager, eventId, userId, [
        'owner',
        'admin',
      ]);
      const hasDescription = input.description !== undefined;
      const hasFallbackIcon = input.fallbackIcon !== undefined;
      const hasMascotAssetId = input.mascotAssetId !== undefined;
      const fallbackIcon = input.fallbackIcon?.trim() || null;
      if (
        hasFallbackIcon &&
        (!fallbackIcon || !EVENT_FALLBACK_ICONS.has(fallbackIcon))
      )
        throw new BadRequestException('Invalid fallback icon');
      if (input.mascotAssetId) {
        const assets = await manager.query<{ id: string }[]>(
          `SELECT asset.id FROM media_assets asset
           WHERE asset.id=$1 AND asset.organization_id=$2 AND asset.status='active'
             AND asset.mime_type=ANY($3::text[])`,
          [
            input.mascotAssetId,
            event.organizationId,
            ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
          ],
        );
        if (!assets[0]) throw new BadRequestException('Invalid mascot asset');
      }
      const rows = await manager.query<
        {
          id: string;
          name: string;
          slug: string;
          description: string;
          fallbackIcon: string;
          mascotAssetId: string | null;
        }[]
      >(
        `UPDATE event_sites
         SET description=CASE WHEN $2 THEN $3 ELSE description END,
             fallback_icon=CASE WHEN $4 THEN $5 ELSE fallback_icon END,
             mascot_asset_id=CASE WHEN $6 THEN $7::uuid ELSE mascot_asset_id END,
             updated_at=now()
         WHERE id=$1
         RETURNING id,name,slug,description,fallback_icon AS "fallbackIcon",mascot_asset_id AS "mascotAssetId"`,
        [
          eventId,
          hasDescription,
          hasDescription ? input.description?.trim() : null,
          hasFallbackIcon,
          fallbackIcon,
          hasMascotAssetId,
          input.mascotAssetId ?? null,
        ],
      );
      return { data: rows[0], errors: [] };
    });
  }

  async activateEvent(eventId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const event = await this.authorizedEvent(manager, eventId, userId, [
        'owner',
        'admin',
      ]);
      const categoryState = await manager.query<
        Array<{ publicationStatus: string; hasPublication: boolean }>
      >(
        `SELECT category.publication_status AS "publicationStatus",
                EXISTS(SELECT 1 FROM event_publications publication WHERE publication.event_site_id=$1) AS "hasPublication"
         FROM competition_categories category WHERE category.id=$2`,
        [eventId, event.categoryId],
      );
      if (
        categoryState[0]?.publicationStatus === 'published' &&
        !categoryState[0].hasPublication
      )
        throw new BadRequestException(
          'Publikasikan isi Event sebelum menjadikannya aktif pada kategori published',
        );
      const identity = await manager.query<
        Array<{ periodYear: number | null }>
      >(`SELECT period_year AS "periodYear" FROM event_sites WHERE id=$1`, [
        eventId,
      ]);
      if (!identity[0]?.periodYear)
        throw new BadRequestException(
          'Tetapkan identitas periode sebelum mengaktifkan Event',
        );
      await manager.query(
        `SELECT id FROM event_sites
         WHERE category_id=$1 AND deleted_at IS NULL FOR UPDATE`,
        [event.categoryId],
      );
      await manager.query(
        `UPDATE event_sites SET is_active=false,updated_at=now()
         WHERE category_id=$1 AND is_active=true AND deleted_at IS NULL`,
        [event.categoryId],
      );
      await manager.query(
        `UPDATE event_sites
         SET is_active=true,activated_at=COALESCE(activated_at,now()),updated_at=now()
         WHERE id=$1`,
        [eventId],
      );
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes)
         VALUES($1,$2,'activate','event_site',$1,$3)`,
        [eventId, userId, JSON.stringify({ isActive: true })],
      );
      return { data: { id: eventId, isActive: true }, errors: [] };
    });
  }

  async deactivateEvent(eventId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      await this.authorizedEvent(manager, eventId, userId, ['owner', 'admin']);
      await manager.query(
        `UPDATE event_sites SET is_active=false,updated_at=now() WHERE id=$1`,
        [eventId],
      );
      return { data: { id: eventId, isActive: false }, errors: [] };
    });
  }

  async categoryEvents(categoryId: string, userId: string) {
    await this.authorizedCategoryRead(categoryId, userId);
    const rows = await this.dataSource.query(
      `SELECT event.id,event.name,event.slug,event.description,
              event.fallback_icon AS "fallbackIcon",event.mascot_asset_id AS "mascotAssetId",
              detail.archive_display_name AS "archiveDisplayName",
              event.period_year AS "periodYear",
              event.batch_number AS "batchNumber",event.batch_label AS "batchLabel",
              event.batch_note AS "batchNote",event.period_year IS NULL AS "needsPeriodConfirmation",
              event.is_active AS "isActive",event.activated_at IS NOT NULL AND event.is_active=false AS "isArchive",
              event.status,event.created_at AS "createdAt",publication.version AS "publishedVersion",
              publication.published_at AS "publishedAt",
              CASE WHEN publication.event_site_id IS NULL THEN 'unpublished'
                   ELSE 'published' END AS "publicationState"
       FROM event_sites event
       LEFT JOIN event_publications publication ON publication.event_site_id=event.id
       LEFT JOIN event_detail_settings detail ON detail.event_site_id=event.id
       WHERE event.category_id=$1 AND event.deleted_at IS NULL
       ORDER BY event.is_active DESC,event.period_year DESC NULLS LAST,
                event.batch_number DESC NULLS LAST,event.created_at DESC`,
      [categoryId],
    );
    return { data: rows, errors: [] };
  }

  async deleteCategory(categoryId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      await this.authorizedCategory(manager, categoryId, userId, [
        'owner',
        'admin',
      ]);
      await manager.query(
        `UPDATE competition_categories SET status='suspended',deleted_at=now(),updated_at=now() WHERE id=$1`,
        [categoryId],
      );
      return { data: { id: categoryId, deleted: true }, errors: [] };
    });
  }

  async publishCategory(categoryId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const cat = await this.authorizedCategory(manager, categoryId, userId, [
        'owner',
        'admin',
      ]);
      const readiness = await manager.query<Array<{ id: string }>>(
        `SELECT event.id FROM event_sites event
         JOIN event_publications publication ON publication.event_site_id=event.id
         WHERE event.category_id=$1 AND event.is_active=true
           AND event.status='active' AND event.deleted_at IS NULL`,
        [categoryId],
      );
      if (!readiness[0])
        throw new BadRequestException(
          'Aktifkan dan publikasikan isi Event sebelum memublikasikan kategori',
        );
      const hostname = `${cat.slug}.${this.publicBaseDomain()}`;
      const hostnameOwner = await manager.query<{ categoryId: string }[]>(
        `SELECT category_id AS "categoryId" FROM site_domains WHERE hostname=$1`,
        [hostname],
      );
      if (hostnameOwner[0] && hostnameOwner[0].categoryId !== categoryId)
        throw new ConflictException('Subdomain sudah dipakai kategori lain');
      const primaryDomains = await manager.query<{ id: string }[]>(
        `SELECT id FROM site_domains WHERE category_id=$1 AND is_primary=true LIMIT 1`,
        [categoryId],
      );
      if (primaryDomains[0]) {
        await manager.query(
          `UPDATE site_domains SET hostname=$2,verified_at=now() WHERE id=$1`,
          [primaryDomains[0].id, hostname],
        );
      } else {
        await manager.query(
          `INSERT INTO site_domains(category_id,hostname,is_primary,verified_at) VALUES($1,$2,true,now())`,
          [categoryId, hostname],
        );
      }
      await manager.query(
        `UPDATE competition_categories SET publication_status='published',published_at=COALESCE(published_at,now()),updated_at=now() WHERE id=$1`,
        [categoryId],
      );
      return {
        data: { id: categoryId, publicationStatus: 'published', hostname },
        errors: [],
      };
    });
  }

  async unpublishCategory(categoryId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      await this.authorizedCategory(manager, categoryId, userId, [
        'owner',
        'admin',
      ]);
      await manager.query(
        `UPDATE competition_categories SET publication_status='unpublished',updated_at=now() WHERE id=$1`,
        [categoryId],
      );
      return {
        data: { id: categoryId, publicationStatus: 'unpublished' },
        errors: [],
      };
    });
  }

  async deleteEvent(eventId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      await this.authorizedEvent(manager, eventId, userId, ['owner', 'admin']);
      const identity = await manager.query<
        Array<{ periodYear: number | null; batchNumber: number | null }>
      >(
        `SELECT period_year AS "periodYear",batch_number AS "batchNumber"
         FROM event_sites WHERE id=$1`,
        [eventId],
      );
      await manager.query(
        `UPDATE event_sites
         SET status='suspended',deleted_at=now(),batch_number=NULL,batch_label=NULL,updated_at=now()
         WHERE id=$1`,
        [eventId],
      );
      const periodYear = identity[0]?.periodYear ?? null;
      if (periodYear !== null && identity[0]?.batchNumber !== null)
        await this.reconcilePeriodBatches(
          manager,
          eventId,
          periodYear,
        );
      return { data: { id: eventId, deleted: true }, errors: [] };
    });
  }

  private async reconcilePeriodBatches(
    manager: EntityManager,
    deletedEventId: string,
    periodYear: number,
  ) {
    const survivors = await manager.query<
      Array<{ id: string; batchLabel: string | null }>
    >(
      `SELECT event.id,event.batch_label AS "batchLabel"
       FROM event_sites event
       INNER JOIN (
         SELECT category_id FROM event_sites WHERE id=$1
       ) target ON target.category_id=event.category_id
       WHERE event.period_year=$2
         AND event.batch_number IS NOT NULL
         AND event.deleted_at IS NULL
         AND event.id<>$1
       ORDER BY event.batch_number,event.created_at,event.id`,
      [deletedEventId, periodYear],
    );
    if (!survivors.length) return;
    if (survivors.length === 1) {
      await manager.query(
        `UPDATE event_sites
         SET batch_number=NULL,batch_label=NULL,slug=$2,updated_at=now()
         WHERE id=$1`,
        [survivors[0].id, this.periodSlug(periodYear, null, null)],
      );
      return;
    }
    for (let index = 0; index < survivors.length; index += 1) {
      const survivor = survivors[index];
      const batchNumber = index + 1;
      const label = this.batchLabel(survivor.batchLabel ?? undefined);
      await manager.query(
        `UPDATE event_sites
         SET batch_number=$2,batch_label=$3,slug=$4,updated_at=now()
         WHERE id=$1`,
        [
          survivor.id,
          batchNumber,
          label,
          this.periodSlug(periodYear, label, batchNumber),
        ],
      );
    }
  }

  async event(eventId: string, userId: string) {
    const event = await this.authorizedEventRead(eventId, userId);
    return {
      data: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        description: event.description || '',
        fallbackIcon: event.fallbackIcon,
        mascotAssetId: event.mascotAssetId,
        isActive: event.isActive,
        status: event.status,
        categoryId: event.categoryId,
        periodYear: event.periodYear,
        batchNumber: event.batchNumber,
        batchLabel: event.batchLabel,
      },
      errors: [],
    };
  }

  async settings(eventId: string, userId: string) {
    await this.authorizedEventRead(eventId, userId);
    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) throw new ForbiddenException('Event not found');
    const rows = await this.dataSource.query<
      Array<{
        primaryColor: string;
        navbarLogoSize: number;
        navigation: Record<string, boolean>;
        contact: Record<string, string>;
        footer: Record<string, string>;
        seo: Record<string, string>;
      }>
    >(
      `SELECT primary_color AS "primaryColor",navbar_logo_size AS "navbarLogoSize",navigation,contact,footer,seo FROM site_settings WHERE event_site_id=$1`,
      [eventId],
    );
    return {
      data: {
        eventName: event.name,
        eventDescription: event.description,
        logoAssetId: event.logoAssetId ?? null,
        logoUrl: event.logoAssetId
          ? `/api/v1/admin/events/${eventId}/media/${event.logoAssetId}`
          : null,
        navbarLogoSize: rows[0]?.navbarLogoSize ?? 36,
        primaryColor: rows[0]?.primaryColor ?? '#1e4b8c',
        navigation: rows[0]?.navigation ?? {},
        contact: rows[0]?.contact ?? {},
        footer: rows[0]?.footer ?? {},
        seo: rows[0]?.seo ?? {},
      },
      errors: [],
    };
  }

  async putSettings(
    eventId: string,
    userId: string,
    input: {
      eventDescription?: string;
      primaryColor: string;
      logoAssetId?: string | null;
      navbarLogoSize?: number;
      navigation: Record<string, boolean>;
      contact: Record<string, string>;
      footer: Record<string, string>;
      seo?: Record<string, string>;
    },
  ) {
    await this.authorizedEventContentWrite(eventId, userId);
    await this.dataSource.transaction(async (manager) => {
      if (input.logoAssetId) {
        const owned = await manager.query<Array<{ id: string }>>(
          `SELECT asset.id FROM media_assets asset
           JOIN event_sites event ON event.organization_id=asset.organization_id
           WHERE asset.id=$1 AND event.id=$2 AND asset.status='active'
             AND asset.mime_type=ANY($3::text[])`,
          [
            input.logoAssetId,
            eventId,
            ['image/png', 'image/jpeg', 'image/webp'],
          ],
        );
        if (!owned[0]) throw new BadRequestException('Invalid logo asset');
      }
      await manager.query(
        `UPDATE event_sites SET description=$2,logo_asset_id=$3,updated_at=now() WHERE id=$1`,
        [
          eventId,
          input.eventDescription?.trim() ?? '',
          input.logoAssetId ?? null,
        ],
      );
      await manager.query(
        `INSERT INTO site_settings(event_site_id,primary_color,navbar_logo_size,navigation,contact,footer,seo)
         VALUES($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT(event_site_id) DO UPDATE SET primary_color=EXCLUDED.primary_color,navbar_logo_size=EXCLUDED.navbar_logo_size,navigation=EXCLUDED.navigation,contact=EXCLUDED.contact,footer=EXCLUDED.footer,seo=EXCLUDED.seo`,
        [
          eventId,
          input.primaryColor,
          input.navbarLogoSize ?? 36,
          input.navigation,
          input.contact,
          input.footer,
          input.seo ?? {},
        ],
      );
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes) VALUES($1,$2,'update','site_settings',$1,$3)`,
        [eventId, userId, JSON.stringify(input)],
      );
    });
    return this.settings(eventId, userId);
  }

  async faq(eventId: string, userId: string) {
    await this.authorizedEventRead(eventId, userId);
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
      [eventId],
    );
    return { data: { categories: rows }, errors: [] };
  }

  async putFaq(
    eventId: string,
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
    await this.authorizedEventContentWrite(eventId, userId);
    await this.dataSource.transaction(async (manager) => {
      await manager.query(`DELETE FROM faq_categories WHERE event_site_id=$1`, [
        eventId,
      ]);
      for (const [categoryOrder, category] of categories.entries()) {
        const categoryRows = await manager.query<{ id: string }[]>(
          `INSERT INTO faq_categories(id,event_site_id,title,is_active,sort_order) VALUES(COALESCE($1,gen_random_uuid()),$2,$3,$4,$5) RETURNING id`,
          [
            category.id ?? null,
            eventId,
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
        [eventId, userId, JSON.stringify({ categoryCount: categories.length })],
      );
    });
    return this.faq(eventId, userId);
  }

  async downloads(eventId: string, userId: string) {
    await this.authorizedEventRead(eventId, userId);
    const rows = await this.dataSource.query<
      {
        tabId: string;
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
      `SELECT dt.id AS "tabId",dt.custom_tab_name AS "customTabName",dt.is_default AS "isDefault",dt.is_active AS "isActive",dt.sort_order AS "sortOrder",
       COALESCE(jsonb_agg(jsonb_build_object('documentId',dds.document_id,'isVisible',dds.is_visible,'labelOverride',dds.label_override,'sortOrder',dds.sort_order) ORDER BY dds.sort_order,dds.document_id) FILTER (WHERE dds.document_id IS NOT NULL),'[]') AS documents
       FROM download_tabs dt LEFT JOIN download_document_settings dds ON dds.download_tab_id=dt.id
       WHERE dt.event_site_id=$1 GROUP BY dt.id ORDER BY dt.sort_order,dt.id`,
      [eventId],
    );
    return { data: { tabs: rows }, errors: [] };
  }

  async putDownloads(
    eventId: string,
    userId: string,
    tabs: {
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
    await this.authorizedEventContentWrite(eventId, userId);
    if (tabs.filter((t) => t.isDefault).length > 1)
      throw new BadRequestException('Only one default download tab is allowed');
    await this.dataSource.transaction(async (manager) => {
      await manager.query(`DELETE FROM download_tabs WHERE event_site_id=$1`, [
        eventId,
      ]);
      for (const [tabOrder, tab] of tabs.entries()) {
        const rowResult = await manager.query<{ id: string }[]>(
          `INSERT INTO download_tabs(event_site_id,custom_tab_name,is_default,is_active,sort_order) VALUES($1,$2,$3,$4,$5) RETURNING id`,
          [
            eventId,
            tab.customTabName.trim(),
            tab.isDefault,
            tab.isActive,
            tabOrder,
          ],
        );
        for (const [docOrder, doc] of tab.documents.entries()) {
          const docOwned = await manager.query<
            { id: string; eventSiteId: string }[]
          >(
            `SELECT d.id, d.event_site_id AS "eventSiteId" FROM event_documents d
             JOIN event_sites current_event ON current_event.id=$2
             JOIN event_sites doc_event ON doc_event.id=d.event_site_id
             WHERE d.id=$1 AND doc_event.category_id=current_event.category_id`,
            [doc.documentId, eventId],
          );
          if (!docOwned[0])
            throw new BadRequestException(
              'Download document does not belong to this event category',
            );
          await manager.query(
            `INSERT INTO download_document_settings(download_tab_id,document_id,event_site_id,is_visible,label_override,sort_order) VALUES($1,$2,$3,$4,$5,$6)`,
            [
              rowResult[0].id,
              doc.documentId,
              eventId,
              doc.isVisible,
              doc.labelOverride.trim(),
              docOrder,
            ],
          );
        }
      }
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes) VALUES($1,$2,'update','downloads',$1,$3)`,
        [eventId, userId, JSON.stringify({ tabCount: tabs.length })],
      );
    });
    return this.downloads(eventId, userId);
  }

  async home(eventId: string, userId: string) {
    await this.authorizedEventRead(eventId, userId);
    const rows = await this.dataSource.query<
      {
        sectionType: string;
        isActive: boolean;
        sortOrder: number;
        settings: Record<string, unknown>;
      }[]
    >(
      `SELECT section_type AS "sectionType",is_active AS "isActive",sort_order AS "sortOrder",settings FROM home_sections WHERE event_site_id=$1 ORDER BY sort_order,id`,
      [eventId],
    );
    return { data: { sections: rows }, errors: [] };
  }

  async putHome(
    eventId: string,
    userId: string,
    sections: {
      sectionType: string;
      isActive: boolean;
      settings: Record<string, unknown>;
    }[],
  ) {
    await this.authorizedEventContentWrite(eventId, userId);
    if (new Set(sections.map((s) => s.sectionType)).size !== sections.length)
      throw new BadRequestException('Home section types must be unique');
    await this.dataSource.transaction(async (manager) => {
      const normalizedSections = sections.map((section) => ({
        ...section,
        settings: { ...section.settings },
      }));
      const hero = normalizedSections.find(
        (section) => section.sectionType === 'hero',
      );
      const heroImage =
        typeof hero?.settings.image === 'string'
          ? hero.settings.image.trim()
          : '';
      if (heroImage) {
        let parsed: URL | null = null;
        try {
          parsed = new URL(heroImage, 'http://internal');
        } catch {}
        const assetId = parsed?.pathname.match(
          /^\/api\/v1\/public\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
        )?.[1];
        if (assetId) {
          const assets = await manager.query<{ id: string }[]>(
            `SELECT asset.id FROM media_assets asset
             JOIN event_sites event ON event.organization_id=asset.organization_id
             WHERE event.id=$1 AND asset.id=$2 AND asset.status='active'
               AND asset.mime_type=ANY($3::text[]) AND asset.byte_size<=$4`,
            [
              eventId,
              assetId,
              ['image/png', 'image/jpeg', 'image/webp'],
              2 * 1024 * 1024,
            ],
          );
          if (!assets[0]) throw new BadRequestException('Invalid Hero image');
          if (hero)
            hero.settings.image = `/api/v1/public/media/${assetId}`;
        }
      }
      await manager.query(
        `DELETE FROM home_sections WHERE event_site_id=$1 AND NOT(section_type=ANY($2::text[]))`,
        [eventId, normalizedSections.map((s) => s.sectionType)],
      );
      for (const [sortOrder, section] of normalizedSections.entries()) {
        await manager.query(
          `INSERT INTO home_sections(event_site_id,section_type,is_active,sort_order,settings) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_site_id,section_type) DO UPDATE SET is_active=EXCLUDED.is_active,sort_order=EXCLUDED.sort_order,settings=EXCLUDED.settings`,
          [
            eventId,
            section.sectionType,
            section.isActive,
            sortOrder,
            section.settings,
          ],
        );
      }
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes) VALUES($1,$2,'update','home_sections',$1,$3)`,
        [eventId, userId, JSON.stringify({ sectionCount: sections.length })],
      );
    });
    return this.home(eventId, userId);
  }

  // --- helpers ---

  private async createPeriodEvent(
    manager: EntityManager,
    category: { id: string; organizationId: string; name: string },
    userId: string,
    input: EventPeriodInput,
    template: EventTemplate | null = null,
  ) {
    const identities = await this.periodEvents(
      manager,
      category.id,
      input.periodYear,
    );
    const live = identities.filter((item) => !item.deletedAt);
    const unbatched = live.find((item) => item.batchNumber === null);
    let batchNumber: number | null = null;
    let label: string | null = null;
    if (unbatched) {
      if (!input.batchEnabled || !input.confirmBatchConversion)
        throw this.batchConversionConflict(unbatched, input.periodYear);
      label = this.batchLabel(input.batchLabel);
      await manager.query(
        `UPDATE event_sites
         SET batch_number=1,batch_label=$2,slug=$3,updated_at=now()
         WHERE id=$1`,
        [unbatched.id, label, this.periodSlug(input.periodYear, label, 1)],
      );
      batchNumber = this.nextBatchNumber(identities, 1);
    } else if (
      input.batchEnabled ||
      identities.some((item) => item.batchNumber)
    ) {
      label =
        identities.find((item) => item.batchLabel)?.batchLabel ??
        this.batchLabel(input.batchLabel);
      batchNumber = this.nextBatchNumber(identities);
    } else if (live.length) {
      throw new ConflictException('Event periode tersebut sudah tersedia');
    }
    const slug = this.periodSlug(input.periodYear, label, batchNumber);
    const event = await manager.save(
      manager.create(EventSite, {
        categoryId: category.id,
        organizationId: category.organizationId,
        name: category.name,
        slug,
        periodYear: input.periodYear,
        batchNumber,
        batchLabel: label,
        batchNote: input.batchNote?.trim() ?? '',
        description: template?.description ?? '',
        logoAssetId: template?.logoAssetId ?? null,
        mascotAssetId: template?.mascotAssetId ?? null,
        fallbackIcon: template?.fallbackIcon ?? 'graduation-cap',
        isActive: false,
        status: 'active',
      }),
    );
    await manager.query(`INSERT INTO site_settings(event_site_id) VALUES($1)`, [
      event.id,
    ]);
    if (template)
      await this.cloneEventTemplate(manager, template.id, event.id);
    await manager.query(
      `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes)
       VALUES($1,$2,'create','event_site',$1,$3)`,
      [
        event.id,
        userId,
        JSON.stringify({
          periodYear: input.periodYear,
          batchNumber,
          batchLabel: label,
          ...(template
            ? {
                templateSourceEventId: template.id,
                templateModules: [
                  'site_settings',
                  'home',
                  'faq',
                  'page_settings',
                  'winner_page_settings',
                  'winner_categories',
                ],
              }
            : {}),
        }),
      ],
    );
    return {
      data: {
        id: event.id,
        name: event.name,
        slug,
        periodYear: input.periodYear,
        batchNumber,
        batchLabel: label,
        batchNote: event.batchNote,
        isActive: false,
      },
      errors: [],
    };
  }

  private async latestTemplateEvent(
    manager: { query: DataSource['query'] },
    categoryId: string,
  ) {
    const rows = await manager.query<EventTemplate[]>(
      `SELECT id,description,logo_asset_id AS "logoAssetId",
              mascot_asset_id AS "mascotAssetId",fallback_icon AS "fallbackIcon"
       FROM event_sites
       WHERE category_id=$1 AND deleted_at IS NULL
       ORDER BY period_year DESC NULLS LAST,
                COALESCE(batch_number,1) DESC,
                created_at DESC,
                id DESC
       LIMIT 1`,
      [categoryId],
    );
    return rows[0] ?? null;
  }

  private async cloneEventTemplate(
    manager: EntityManager,
    sourceEventId: string,
    targetEventId: string,
  ) {
    await manager.query(
      `UPDATE site_settings target
       SET primary_color=source.primary_color,
           navbar_logo_size=source.navbar_logo_size,
           navigation=source.navigation,
           contact=source.contact,
           footer=source.footer,
           seo=source.seo
       FROM site_settings source
       WHERE source.event_site_id=$1 AND target.event_site_id=$2`,
      [sourceEventId, targetEventId],
    );
    await manager.query(
      `INSERT INTO page_settings(event_site_id,page_type,is_active,eyebrow,title,description,alignment)
       SELECT $2,page_type,is_active,eyebrow,title,description,alignment
       FROM page_settings WHERE event_site_id=$1`,
      [sourceEventId, targetEventId],
    );
    await manager.query(
      `INSERT INTO winner_page_settings(event_site_id,is_active,show_decree,metadata_visibility,archive_active,archive_limit)
       SELECT $2,is_active,show_decree,metadata_visibility,archive_active,archive_limit
       FROM winner_page_settings WHERE event_site_id=$1`,
      [sourceEventId, targetEventId],
    );
    await manager.query(
      `INSERT INTO winner_categories(event_site_id,name,rank_prefix,icon,is_active,sort_order)
       SELECT $2,name,rank_prefix,icon,is_active,sort_order
       FROM winner_categories WHERE event_site_id=$1`,
      [sourceEventId, targetEventId],
    );
    await manager.query(
      `INSERT INTO home_sections(event_site_id,section_type,is_active,sort_order,settings)
       SELECT $2,section_type,is_active,sort_order,settings
       FROM home_sections WHERE event_site_id=$1`,
      [sourceEventId, targetEventId],
    );
    await manager.query(
      `INSERT INTO hero_badges(section_id,label,sort_order)
       SELECT target.id,item.label,item.sort_order
       FROM hero_badges item
       JOIN home_sections source ON source.id=item.section_id
       JOIN home_sections target ON target.event_site_id=$2 AND target.section_type=source.section_type
       WHERE source.event_site_id=$1`,
      [sourceEventId, targetEventId],
    );
    await manager.query(
      `INSERT INTO hero_actions(section_id,label,url,variant,sort_order)
       SELECT target.id,item.label,item.url,item.variant,item.sort_order
       FROM hero_actions item
       JOIN home_sections source ON source.id=item.section_id
       JOIN home_sections target ON target.event_site_id=$2 AND target.section_type=source.section_type
       WHERE source.event_site_id=$1`,
      [sourceEventId, targetEventId],
    );
    await manager.query(
      `INSERT INTO schedule_items(section_id,title,date,time_start,time_end,is_active,sort_order)
       SELECT target.id,item.title,item.date,item.time_start,item.time_end,item.is_active,item.sort_order
       FROM schedule_items item
       JOIN home_sections source ON source.id=item.section_id
       JOIN home_sections target ON target.event_site_id=$2 AND target.section_type=source.section_type
       WHERE source.event_site_id=$1`,
      [sourceEventId, targetEventId],
    );
    await manager.query(
      `WITH package_map AS (
         SELECT package.id AS source_id,uuid_generate_v4() AS target_id,target.id AS target_section_id,
                package.title,package.price,package.is_featured,package.action_label,
                package.action_url,package.is_active,package.sort_order
         FROM pricing_packages package
         JOIN home_sections source ON source.id=package.section_id
         JOIN home_sections target ON target.event_site_id=$2 AND target.section_type=source.section_type
         WHERE source.event_site_id=$1
       ), inserted_packages AS (
         INSERT INTO pricing_packages(id,section_id,title,price,is_featured,action_label,action_url,is_active,sort_order)
         SELECT target_id,target_section_id,title,price,is_featured,action_label,action_url,is_active,sort_order
         FROM package_map RETURNING id
       )
       INSERT INTO pricing_facilities(package_id,label,is_included,sort_order)
       SELECT map.target_id,facility.label,facility.is_included,facility.sort_order
       FROM pricing_facilities facility
       JOIN package_map map ON map.source_id=facility.package_id
       WHERE (SELECT count(*) FROM inserted_packages)>=0`,
      [sourceEventId, targetEventId],
    );
    await manager.query(
      `INSERT INTO benefit_items(section_id,title,description,icon,is_active,sort_order)
       SELECT target.id,item.title,item.description,item.icon,item.is_active,item.sort_order
       FROM benefit_items item
       JOIN home_sections source ON source.id=item.section_id
       JOIN home_sections target ON target.event_site_id=$2 AND target.section_type=source.section_type
       WHERE source.event_site_id=$1`,
      [sourceEventId, targetEventId],
    );
    await manager.query(
      `INSERT INTO partner_items(section_id,name,logo_asset_id,url,is_active,sort_order)
       SELECT target.id,item.name,item.logo_asset_id,item.url,item.is_active,item.sort_order
       FROM partner_items item
       JOIN home_sections source ON source.id=item.section_id
       JOIN home_sections target ON target.event_site_id=$2 AND target.section_type=source.section_type
       WHERE source.event_site_id=$1`,
      [sourceEventId, targetEventId],
    );
    await manager.query(
      `WITH category_map AS (
         SELECT category.id AS source_id,uuid_generate_v4() AS target_id,
                category.title,category.is_active,category.sort_order
         FROM faq_categories category WHERE category.event_site_id=$1
       ), inserted_categories AS (
         INSERT INTO faq_categories(id,event_site_id,title,is_active,sort_order)
         SELECT target_id,$2,title,is_active,sort_order FROM category_map
         RETURNING id
       )
       INSERT INTO faq_questions(category_id,question,answer,is_active,sort_order)
       SELECT map.target_id,question.question,question.answer,question.is_active,question.sort_order
       FROM faq_questions question
       JOIN category_map map ON map.source_id=question.category_id
       WHERE (SELECT count(*) FROM inserted_categories)>=0`,
      [sourceEventId, targetEventId],
    );
  }

  private periodEvents(
    manager: { query: DataSource['query'] },
    categoryId: string,
    periodYear: number,
  ) {
    return manager.query<
      Array<{
        id: string;
        name: string;
        batchNumber: number | null;
        batchLabel: string | null;
        deletedAt: Date | null;
      }>
    >(
      `SELECT id,name,batch_number AS "batchNumber",batch_label AS "batchLabel",deleted_at AS "deletedAt"
       FROM event_sites
       WHERE category_id=$1 AND period_year=$2
       ORDER BY batch_number NULLS FIRST,created_at,id
       FOR UPDATE`,
      [categoryId, periodYear],
    );
  }

  private nextBatchNumber(
    events: Array<{ batchNumber: number | null }>,
    minimum = 0,
  ) {
    return (
      Math.max(minimum, ...events.map((item) => item.batchNumber ?? 0)) + 1
    );
  }

  private batchLabel(value?: string) {
    const label = value?.trim() || 'Gelombang';
    if (label.length > 40)
      throw new BadRequestException('Istilah publik maksimal 40 karakter');
    return label;
  }

  private periodSlug(
    periodYear: number,
    batchLabel: string | null,
    batchNumber: number | null,
  ) {
    if (!batchLabel || !batchNumber) return String(periodYear);
    const label = batchLabel
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
    return `${periodYear}-${label || 'batch'}-${batchNumber}`;
  }

  private batchConversionConflict(
    existing: { id: string; name: string },
    periodYear: number,
  ) {
    return new ConflictException({
      statusCode: 409,
      message:
        'Event tahun ini sudah ada. Konfirmasi konversi ke beberapa gelombang.',
      code: 'EVENT_YEAR_REQUIRES_BATCH_CONVERSION',
      existingEvent: {
        id: existing.id,
        name: existing.name,
        periodYear,
        nextBatchNumber: 2,
      },
    });
  }

  private publicBaseDomain() {
    return this.config
      .get<string>('PUBLIC_BASE_DOMAIN', 'nexaplaymetadata.online')
      .trim()
      .toLowerCase()
      .replace(/^\.+|\.+$/g, '');
  }

  private async userMembership(
    manager: { query: DataSource['query'] },
    userId: string,
  ) {
    const memberships = await manager.query<
      { organizationId: string; organizationName: string; role: string }[]
    >(
      `SELECT o.id AS "organizationId",o.name AS "organizationName",m.role
       FROM organization_memberships m
       JOIN organizations o ON o.id=m.organization_id
       WHERE m.user_id=$1 AND m.role IN ('owner','admin')
         AND o.status='active' AND o.deleted_at IS NULL
       ORDER BY CASE m.role WHEN 'owner' THEN 0 ELSE 1 END,o.name LIMIT 1`,
      [userId],
    );
    if (!memberships[0])
      throw new ForbiddenException('Organization access denied');
    return memberships[0];
  }

  private async authorizedCategory(
    manager: { query: DataSource['query'] },
    categoryId: string,
    userId: string,
    roles: string[],
  ) {
    const rows = await manager.query<
      { id: string; organizationId: string; name: string; slug: string }[]
    >(
      `SELECT c.id,c.organization_id AS "organizationId",c.name,c.slug
       FROM competition_categories c
       INNER JOIN organization_memberships m ON m.organization_id=c.organization_id
       WHERE c.id=$1 AND m.user_id=$2 AND m.role=ANY($3::text[])
         AND c.deleted_at IS NULL AND c.status='active'
       FOR UPDATE OF c`,
      [categoryId, userId, roles],
    );
    if (!rows[0]) throw new ForbiddenException('Category access denied');
    return rows[0];
  }

  private async authorizedCategoryRead(categoryId: string, userId: string) {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `SELECT c.id FROM competition_categories c
       INNER JOIN organization_memberships m ON m.organization_id=c.organization_id
       WHERE c.id=$1 AND m.user_id=$2 AND c.deleted_at IS NULL`,
      [categoryId, userId],
    );
    if (!rows[0]) throw new ForbiddenException('Category access denied');
    return rows[0];
  }

  private async authorizedEvent(
    manager: { query: DataSource['query'] },
    eventId: string,
    userId: string,
    roles: string[],
  ) {
    const rows = await manager.query<
      { id: string; categoryId: string; organizationId: string }[]
    >(
      `SELECT e.id,e.category_id AS "categoryId",e.organization_id AS "organizationId"
       FROM event_sites e
       INNER JOIN organization_memberships m ON m.organization_id=e.organization_id
       WHERE e.id=$1 AND m.user_id=$2 AND m.role=ANY($3::text[])
         AND e.deleted_at IS NULL
       FOR UPDATE OF e`,
      [eventId, userId, roles],
    );
    if (!rows[0]) throw new ForbiddenException('Event access denied');
    return rows[0];
  }

  private async authorizedEventContentWrite(eventId: string, userId: string) {
    const rows = await this.dataSource.query<{ id: string }[]>(
      `SELECT event.id FROM event_sites event
       INNER JOIN organization_memberships membership ON membership.organization_id=event.organization_id
       WHERE event.id=$1 AND membership.user_id=$2
         AND membership.role IN ('owner','admin','editor')
         AND event.deleted_at IS NULL`,
      [eventId, userId],
    );
    if (!rows[0]) throw new ForbiddenException('Event write access denied');
  }

  private async authorizedEventRead(eventId: string, userId: string) {
    const event = await this.events
      .createQueryBuilder('e')
      .innerJoin(
        'organization_memberships',
        'm',
        'm.organization_id = e.organization_id',
      )
      .where('e.id = :eventId', { eventId })
      .andWhere('m.user_id = :userId', { userId })
      .andWhere('e.deleted_at IS NULL')
      .getOne();
    if (!event) throw new ForbiddenException('Event access denied');
    return event;
  }
}
