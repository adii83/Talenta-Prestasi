/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- ponytail: TypeORM query() returns any; replace with typed repositories when CRUD DTO shape diverges from table rows. */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

type Table = 'competition_documents' | 'winner_categories' | 'winners';
type Doc = {
  title: string;
  category?: string;
  documentRole?: string;
  assetId?: string;
  isActive?: boolean;
  sortOrder?: number;
};
type Cat = {
  name: string;
  rankPrefix?: string;
  icon?: string;
  isActive?: boolean;
  sortOrder?: number;
};
type Win = {
  categoryId: string;
  fullName: string;
  rankLabel?: string;
  school?: string;
  examNumber?: string;
  isActive?: boolean;
  sortOrder?: number;
};
type Page = {
  isActive?: boolean;
  eyebrow?: string;
  title?: string;
  description?: string;
  alignment?: string;
};

@Injectable()
export class AdminContentService {
  constructor(private readonly db: DataSource) {}

  async list(table: Table, competitionId: string, userId: string) {
    await this.competitionAccess(competitionId, userId, false);
    const rows = await this.db.query(
      `SELECT * FROM ${table} WHERE competition_id=$1 ORDER BY sort_order,id`,
      [competitionId],
    );
    return { data: rows, errors: [] };
  }

  async createDocument(c: string, u: string, d: Doc) {
    return this.write(c, u, 'create', 'document', async (m) => {
      await this.assetOwnership(d.assetId, c, m);
      return (
        await m.query(
          `INSERT INTO competition_documents(competition_id,title,category,document_role,asset_id,is_active,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [
            c,
            d.title.trim(),
            d.category ?? 'Dokumen',
            d.documentRole ?? '',
            d.assetId ?? null,
            d.isActive ?? true,
            d.sortOrder ?? 0,
          ],
        )
      )[0];
    });
  }
  async updateDocument(c: string, id: string, u: string, d: Doc) {
    return this.write(
      c,
      u,
      'update',
      'document',
      async (m) => {
        await this.assetOwnership(d.assetId, c, m);
        return (
          await m.query(
            `UPDATE competition_documents SET title=$3,category=$4,document_role=$5,asset_id=$6,is_active=$7,sort_order=$8 WHERE id=$1 AND competition_id=$2 RETURNING *`,
            [
              id,
              c,
              d.title.trim(),
              d.category ?? 'Dokumen',
              d.documentRole ?? '',
              d.assetId ?? null,
              d.isActive ?? true,
              d.sortOrder ?? 0,
            ],
          )
        )[0];
      },
      id,
    );
  }
  async createCategory(c: string, u: string, d: Cat) {
    return this.write(
      c,
      u,
      'create',
      'winner_category',
      async (m) =>
        (
          await m.query(
            `INSERT INTO winner_categories(competition_id,name,rank_prefix,icon,is_active,sort_order) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
            [
              c,
              d.name.trim(),
              d.rankPrefix ?? 'Juara',
              d.icon ?? 'trophy',
              d.isActive ?? true,
              d.sortOrder ?? 0,
            ],
          )
        )[0],
    );
  }
  async updateCategory(c: string, id: string, u: string, d: Cat) {
    return this.write(
      c,
      u,
      'update',
      'winner_category',
      async (m) =>
        (
          await m.query(
            `UPDATE winner_categories SET name=$3,rank_prefix=$4,icon=$5,is_active=$6,sort_order=$7 WHERE id=$1 AND competition_id=$2 RETURNING *`,
            [
              id,
              c,
              d.name.trim(),
              d.rankPrefix ?? 'Juara',
              d.icon ?? 'trophy',
              d.isActive ?? true,
              d.sortOrder ?? 0,
            ],
          )
        )[0],
      id,
    );
  }
  async createWinner(c: string, u: string, d: Win) {
    return this.write(
      c,
      u,
      'create',
      'winner',
      async (m) =>
        (
          await m.query(
            `INSERT INTO winners(competition_id,category_id,full_name,rank_label,school,exam_number,is_active,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [
              c,
              d.categoryId,
              d.fullName.trim(),
              d.rankLabel ?? '',
              d.school ?? '',
              d.examNumber ?? '',
              d.isActive ?? true,
              d.sortOrder ?? 0,
            ],
          )
        )[0],
    );
  }
  async updateWinner(c: string, id: string, u: string, d: Win) {
    return this.write(
      c,
      u,
      'update',
      'winner',
      async (m) =>
        (
          await m.query(
            `UPDATE winners SET category_id=$3,full_name=$4,rank_label=$5,school=$6,exam_number=$7,is_active=$8,sort_order=$9 WHERE id=$1 AND competition_id=$2 RETURNING *`,
            [
              id,
              c,
              d.categoryId,
              d.fullName.trim(),
              d.rankLabel ?? '',
              d.school ?? '',
              d.examNumber ?? '',
              d.isActive ?? true,
              d.sortOrder ?? 0,
            ],
          )
        )[0],
      id,
    );
  }

  async remove(table: Table, c: string, id: string, u: string) {
    return this.write(
      c,
      u,
      'delete',
      table,
      async (m) => {
        const result = await m.query(
          `DELETE FROM ${table} WHERE id=$1 AND competition_id=$2 RETURNING id`,
          [id, c],
        );
        return result[0];
      },
      id,
    );
  }

  async page(siteId: string, pageType: string, userId: string) {
    await this.siteAccess(siteId, userId, false);
    const rows = await this.db.query(
      `SELECT page_type AS "pageType",is_active AS "isActive",eyebrow,title,description,alignment FROM page_settings WHERE event_site_id=$1 AND page_type=$2`,
      [siteId, pageType],
    );
    return { data: rows[0] ?? null, errors: [] };
  }
  async putPage(siteId: string, pageType: string, userId: string, d: Page) {
    await this.siteAccess(siteId, userId, true);
    const rows = await this.db.query(
      `INSERT INTO page_settings(event_site_id,page_type,is_active,eyebrow,title,description,alignment) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(event_site_id,page_type) DO UPDATE SET is_active=EXCLUDED.is_active,eyebrow=EXCLUDED.eyebrow,title=EXCLUDED.title,description=EXCLUDED.description,alignment=EXCLUDED.alignment RETURNING *`,
      [
        siteId,
        pageType,
        d.isActive ?? true,
        d.eyebrow ?? '',
        d.title ?? '',
        d.description ?? '',
        d.alignment ?? 'center',
      ],
    );
    return { data: rows[0], errors: [] };
  }

  private async write(
    c: string,
    u: string,
    action: string,
    type: string,
    operation: (m: any) => Promise<any>,
    id?: string,
  ) {
    const access = await this.competitionAccess(c, u, true);
    return this.db.transaction(async (m) => {
      const row = await operation(m);
      if (!row) throw new NotFoundException('Resource not found');
      await m.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes) VALUES($1,$2,$3,$4,$5,'{}')`,
        [access.siteId, u, action, type, id ?? row.id],
      );
      return { data: row, errors: [] };
    });
  }
  private async competitionAccess(c: string, u: string, write: boolean) {
    const roles = write
      ? `AND membership.role IN ('owner','admin','editor')`
      : '';
    const rows = await this.db.query(
      `SELECT competition.event_site_id AS "siteId" FROM competitions competition JOIN event_sites site ON site.id=competition.event_site_id JOIN organization_memberships membership ON membership.organization_id=site.organization_id WHERE competition.id=$1 AND membership.user_id=$2 AND competition.deleted_at IS NULL ${roles}`,
      [c, u],
    );
    if (!rows[0]) throw new ForbiddenException('Competition access denied');
    return rows[0] as { siteId: string };
  }
  private async siteAccess(s: string, u: string, write: boolean) {
    const roles = write
      ? `AND membership.role IN ('owner','admin','editor')`
      : '';
    const rows = await this.db.query(
      `SELECT site.id FROM event_sites site JOIN organization_memberships membership ON membership.organization_id=site.organization_id WHERE site.id=$1 AND membership.user_id=$2 AND site.deleted_at IS NULL ${roles}`,
      [s, u],
    );
    if (!rows[0]) throw new ForbiddenException('Site access denied');
  }
  private async assetOwnership(asset: string | undefined, c: string, m: any) {
    if (!asset) return;
    const rows = await m.query(
      `SELECT 1 FROM media_assets asset JOIN competitions competition ON competition.id=$2 JOIN event_sites site ON site.id=competition.event_site_id WHERE asset.id=$1 AND asset.organization_id=site.organization_id`,
      [asset, c],
    );
    if (!rows[0])
      throw new ForbiddenException('Media asset ownership mismatch');
  }
}
