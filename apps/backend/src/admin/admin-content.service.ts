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
  photoAssetId?: string;
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

  async detailSettings(competitionId: string, userId: string) {
    await this.competitionAccess(competitionId, userId, false);
    const settings =
      (
        await this.db.query(
          `SELECT decree_document_id AS "decreeDocumentId",is_active AS "isActive",winners_active AS "winnersActive",documents_active AS "documentsActive",metadata_visibility AS "metadataVisibility" FROM competition_detail_settings WHERE competition_id=$1`,
          [competitionId],
        )
      )[0] ?? null;
    const categories = await this.db.query(
      `SELECT category_id AS "categoryId",is_visible AS "isVisible",sort_order AS "sortOrder" FROM archive_category_settings WHERE competition_id=$1 ORDER BY sort_order,category_id`,
      [competitionId],
    );
    const documents = await this.db.query(
      `SELECT document_id AS "documentId",is_visible AS "isVisible",label_override AS "labelOverride",sort_order AS "sortOrder" FROM archive_document_settings WHERE competition_id=$1 ORDER BY sort_order,document_id`,
      [competitionId],
    );
    return { data: { settings, categories, documents }, errors: [] };
  }

  async putDetailSettings(
    competitionId: string,
    userId: string,
    input: {
      decreeDocumentId?: string;
      isActive: boolean;
      winnersActive: boolean;
      documentsActive: boolean;
      metadataVisibility: Record<string, boolean>;
      categories: { categoryId: string; isVisible: boolean }[];
      documents: {
        documentId: string;
        isVisible: boolean;
        labelOverride: string;
      }[];
    },
  ) {
    await this.competitionAccess(competitionId, userId, true);
    await this.db.transaction(async (manager) => {
      if (input.decreeDocumentId) {
        const decree = await manager.query(
          `SELECT id FROM competition_documents WHERE id=$1 AND competition_id=$2`,
          [input.decreeDocumentId, competitionId],
        );
        if (!decree[0])
          throw new NotFoundException(
            'Decree document does not belong to competition',
          );
      }
      await manager.query(
        `INSERT INTO competition_detail_settings(competition_id,decree_document_id,is_active,winners_active,documents_active,metadata_visibility) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(competition_id) DO UPDATE SET decree_document_id=EXCLUDED.decree_document_id,is_active=EXCLUDED.is_active,winners_active=EXCLUDED.winners_active,documents_active=EXCLUDED.documents_active,metadata_visibility=EXCLUDED.metadata_visibility`,
        [
          competitionId,
          input.decreeDocumentId ?? null,
          input.isActive,
          input.winnersActive,
          input.documentsActive,
          input.metadataVisibility,
        ],
      );
      await manager.query(
        `DELETE FROM archive_category_settings WHERE competition_id=$1`,
        [competitionId],
      );
      for (const [sortOrder, category] of input.categories.entries()) {
        const owned = await manager.query(
          `SELECT id FROM winner_categories WHERE id=$1 AND competition_id=$2`,
          [category.categoryId, competitionId],
        );
        if (!owned[0])
          throw new NotFoundException(
            'Winner category does not belong to competition',
          );
        await manager.query(
          `INSERT INTO archive_category_settings(competition_id,category_id,is_visible,sort_order) VALUES($1,$2,$3,$4)`,
          [competitionId, category.categoryId, category.isVisible, sortOrder],
        );
      }
      await manager.query(
        `DELETE FROM archive_document_settings WHERE competition_id=$1`,
        [competitionId],
      );
      for (const [sortOrder, document] of input.documents.entries()) {
        const owned = await manager.query(
          `SELECT id FROM competition_documents WHERE id=$1 AND competition_id=$2`,
          [document.documentId, competitionId],
        );
        if (!owned[0])
          throw new NotFoundException(
            'Document does not belong to competition',
          );
        await manager.query(
          `INSERT INTO archive_document_settings(competition_id,document_id,is_visible,label_override,sort_order) VALUES($1,$2,$3,$4,$5)`,
          [
            competitionId,
            document.documentId,
            document.isVisible,
            document.labelOverride.trim(),
            sortOrder,
          ],
        );
      }
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes) SELECT event_site_id,$2,'update','competition_detail_settings',$1,$3 FROM competitions WHERE id=$1`,
        [
          competitionId,
          userId,
          JSON.stringify({
            categories: input.categories.length,
            documents: input.documents.length,
          }),
        ],
      );
    });
    return this.detailSettings(competitionId, userId);
  }

  async list(table: Table, competitionId: string, userId: string) {
    await this.competitionAccess(competitionId, userId, false);
    const columns = {
      competition_documents: `id,title,category,document_role AS "documentRole",asset_id AS "assetId",is_active AS "isActive",sort_order AS "sortOrder"`,
      winner_categories: `id,name,rank_prefix AS "rankPrefix",icon,is_active AS "isActive",sort_order AS "sortOrder"`,
      winners: `id,category_id AS "categoryId",full_name AS "fullName",rank_label AS "rankLabel",school,exam_number AS "examNumber",is_active AS "isActive",sort_order AS "sortOrder"`,
    }[table];
    const rows = await this.db.query(
      `SELECT ${columns} FROM ${table} WHERE competition_id=$1 ORDER BY sort_order,id`,
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
            `INSERT INTO winners(competition_id,category_id,full_name,rank_label,school,exam_number,photo_asset_id,is_active,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [
              c,
              d.categoryId,
              d.fullName.trim(),
              d.rankLabel ?? '',
              d.school ?? '',
              d.examNumber ?? '',
              d.photoAssetId ?? null,
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
            `UPDATE winners SET category_id=$3,full_name=$4,rank_label=$5,school=$6,exam_number=$7,photo_asset_id=$8,is_active=$9,sort_order=$10 WHERE id=$1 AND competition_id=$2 RETURNING *`,
            [
              id,
              c,
              d.categoryId,
              d.fullName.trim(),
              d.rankLabel ?? '',
              d.school ?? '',
              d.examNumber ?? '',
              d.photoAssetId ?? null,
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
