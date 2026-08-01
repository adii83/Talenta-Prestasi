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
        slug: row.slug,
        lifecycle: row.lifecycle,
        publicationStatus: row.publicationStatus,
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
    input: { name?: string; description?: string },
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
