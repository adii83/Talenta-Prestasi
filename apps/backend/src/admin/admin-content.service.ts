/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- ponytail: TypeORM query() returns any; replace with typed repositories when CRUD DTO shape diverges from table rows. */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

type Table = 'event_documents' | 'winner_categories' | 'winners';
type Doc = {
  title: string;
  category?: string;
  documentRole?: string;
  fileType?: string;
  displaySize?: string;
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
type WinnerDisplayMode = 'built_in' | 'custom';
type Win = {
  categoryId?: string;
  displayMode?: WinnerDisplayMode;
  designAssetId?: string | null;
  fullName?: string | null;
  rankLabel?: string;
  school?: string | null;
  examNumber?: string | null;
  district?: string | null;
  regency?: string | null;
  province?: string | null;
  photoAssetId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};
type WinnerState = Required<
  Pick<Win, 'categoryId' | 'displayMode' | 'isActive' | 'sortOrder'>
> & {
  designAssetId: string | null;
  fullName: string | null;
  rankLabel: string;
  school: string | null;
  examNumber: string | null;
  district: string | null;
  regency: string | null;
  province: string | null;
  photoAssetId: string | null;
};
type WinnerOrderRow = {
  id: string;
  categoryId: string;
  rankPrefix: string;
  rankLabel: string;
  sortOrder: number;
  isActive: boolean;
};
type Page = {
  isActive?: boolean;
  eyebrow?: string;
  title?: string;
  description?: string;
  alignment?: string;
  showDecree?: boolean;
  metadataVisibility?: Record<string, boolean>;
  archiveActive?: boolean;
  archiveLimit?: number;
};

const DEFAULT_DECREE_TITLE = 'SK Penetapan Pemenang';
const DEFAULT_DECREE_DESCRIPTION =
  'Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah.';

@Injectable()
export class AdminContentService {
  constructor(private readonly db: DataSource) {}

  async detailSettings(eventId: string, userId: string) {
    await this.eventAccess(eventId, userId, false);
    const settings =
      (
        await this.db.query(
          `SELECT archive_display_name AS "archiveDisplayName",decree_document_id AS "decreeDocumentId",decree_title AS "decreeTitle",decree_description AS "decreeDescription",is_active AS "isActive",winners_active AS "winnersActive",documents_active AS "documentsActive",metadata_visibility AS "metadataVisibility" FROM event_detail_settings WHERE event_site_id=$1`,
          [eventId],
        )
      )[0] ?? null;
    const categories = await this.db.query(
      `SELECT category_id AS "categoryId",is_visible AS "isVisible",sort_order AS "sortOrder" FROM archive_category_settings WHERE event_site_id=$1 ORDER BY sort_order,category_id`,
      [eventId],
    );
    const documents = await this.db.query(
      `SELECT document_id AS "documentId",is_visible AS "isVisible",label_override AS "labelOverride",sort_order AS "sortOrder" FROM archive_document_settings WHERE event_site_id=$1 ORDER BY sort_order,document_id`,
      [eventId],
    );
    return { data: { settings, categories, documents }, errors: [] };
  }

  async putDetailSettings(
    eventId: string,
    userId: string,
    input: {
      archiveDisplayName?: string | null;
      description?: string;
      decreeDocumentId?: string;
      decreeTitle?: string;
      decreeDescription?: string;
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
    await this.eventAccess(eventId, userId, true);
    if (typeof input.archiveDisplayName === 'string' && !input.archiveDisplayName.trim())
      throw new BadRequestException('Archive display name is required');
    await this.db.transaction(async (manager) => {
      if (typeof input.description === 'string') {
        await manager.query(
          `UPDATE event_sites SET description=$2, updated_at=now() WHERE id=$1`,
          [eventId, input.description.trim()],
        );
      }
      if (input.decreeDocumentId) {
        const decree = await manager.query(
          `SELECT id FROM event_documents WHERE id=$1 AND event_site_id=$2`,
          [input.decreeDocumentId, eventId],
        );
        if (!decree[0])
          throw new NotFoundException(
            'Decree document does not belong to event',
          );
      }
      const hasArchiveDisplayName = typeof input.archiveDisplayName === 'string';
      await manager.query(
        `INSERT INTO event_detail_settings(event_site_id,archive_display_name,decree_document_id,decree_title,decree_description,is_active,winners_active,documents_active,metadata_visibility) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(event_site_id) DO UPDATE SET archive_display_name=CASE WHEN $10 THEN EXCLUDED.archive_display_name ELSE event_detail_settings.archive_display_name END,decree_document_id=EXCLUDED.decree_document_id,decree_title=EXCLUDED.decree_title,decree_description=EXCLUDED.decree_description,is_active=EXCLUDED.is_active,winners_active=EXCLUDED.winners_active,documents_active=EXCLUDED.documents_active,metadata_visibility=EXCLUDED.metadata_visibility`,
        [
          eventId,
          hasArchiveDisplayName ? input.archiveDisplayName?.trim() : null,
          input.decreeDocumentId ?? null,
          input.decreeTitle?.trim() || DEFAULT_DECREE_TITLE,
          input.decreeDescription?.trim() || DEFAULT_DECREE_DESCRIPTION,
          input.isActive,
          input.winnersActive,
          input.documentsActive,
          input.metadataVisibility,
          hasArchiveDisplayName,
        ],
      );
      await manager.query(
        `DELETE FROM archive_category_settings WHERE event_site_id=$1`,
        [eventId],
      );
      for (const [sortOrder, category] of input.categories.entries()) {
        const owned = await manager.query(
          `SELECT id FROM winner_categories WHERE id=$1 AND event_site_id=$2`,
          [category.categoryId, eventId],
        );
        if (!owned[0])
          throw new NotFoundException(
            'Winner category does not belong to event',
          );
        await manager.query(
          `INSERT INTO archive_category_settings(event_site_id,category_id,is_visible,sort_order) VALUES($1,$2,$3,$4)`,
          [eventId, category.categoryId, category.isVisible, sortOrder],
        );
      }
      await manager.query(
        `DELETE FROM archive_document_settings WHERE event_site_id=$1`,
        [eventId],
      );
      for (const [sortOrder, document] of input.documents.entries()) {
        const owned = await manager.query(
          `SELECT id FROM event_documents WHERE id=$1 AND event_site_id=$2`,
          [document.documentId, eventId],
        );
        if (!owned[0])
          throw new NotFoundException('Document does not belong to event');
        await manager.query(
          `INSERT INTO archive_document_settings(event_site_id,document_id,is_visible,label_override,sort_order) VALUES($1,$2,$3,$4,$5)`,
          [
            eventId,
            document.documentId,
            document.isVisible,
            document.labelOverride.trim(),
            sortOrder,
          ],
        );
      }
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes) VALUES($1,$2,'update','event_detail_settings',$1,$3)`,
        [
          eventId,
          userId,
          JSON.stringify({
            categories: input.categories.length,
            documents: input.documents.length,
          }),
        ],
      );
    });
    return this.detailSettings(eventId, userId);
  }

  async decree(eventId: string, userId: string) {
    await this.eventAccess(eventId, userId, false);
    const rows = await this.db.query(
      `SELECT COALESCE(NULLIF(settings.decree_title,''),document.title,$2) AS title,
              COALESCE(NULLIF(settings.decree_description,''),$3) AS description,
              document.id AS "documentId",document.asset_id AS "assetId",
              document.file_type AS "fileType",document.display_size AS "displaySize"
         FROM event_sites event
         LEFT JOIN event_detail_settings settings ON settings.event_site_id=event.id
         LEFT JOIN event_documents document
           ON document.id=settings.decree_document_id
          AND document.event_site_id=event.id
        WHERE event.id=$1`,
      [eventId, DEFAULT_DECREE_TITLE, DEFAULT_DECREE_DESCRIPTION],
    );
    const row = rows[0] ?? {
      title: DEFAULT_DECREE_TITLE,
      description: DEFAULT_DECREE_DESCRIPTION,
      documentId: null,
      assetId: null,
      fileType: 'PDF',
      displaySize: '',
    };
    return { data: row, errors: [] };
  }

  async putDecree(
    eventId: string,
    userId: string,
    input: {
      title: string;
      description: string;
      assetId?: string;
      fileType?: string;
      displaySize?: string;
      deleteFile?: boolean;
    },
  ) {
    await this.eventAccess(eventId, userId, true);
    await this.db.transaction(async (manager) => {
      if (input.assetId)
        await this.assetOwnership(input.assetId, eventId, manager);
      const title = input.title.trim() || DEFAULT_DECREE_TITLE;
      const description =
        input.description.trim() || DEFAULT_DECREE_DESCRIPTION;
      const existing = await manager.query(
        `SELECT settings.decree_document_id AS "documentId"
           FROM event_detail_settings settings
          WHERE settings.event_site_id=$1`,
        [eventId],
      );
      let documentId = existing[0]?.documentId as string | undefined;
      if (documentId && input.deleteFile) {
        await manager.query(`DELETE FROM event_documents WHERE id=$1`, [
          documentId,
        ]);
        documentId = undefined;
      } else if (documentId) {
        await manager.query(
          `UPDATE event_documents
              SET title=$3,category='SK Pemenang',document_role='winner_decree',
                  file_type=COALESCE($4,file_type),display_size=COALESCE($5,display_size),
                  asset_id=COALESCE($6,asset_id),is_active=true
            WHERE id=$1 AND event_site_id=$2`,
          [
            documentId,
            eventId,
            title,
            input.fileType ?? null,
            input.displaySize ?? null,
            input.assetId ?? null,
          ],
        );
      } else if (input.assetId) {
        const documents = await manager.query(
          `INSERT INTO event_documents(event_site_id,title,category,document_role,file_type,display_size,asset_id,is_active,sort_order)
           VALUES($1,$2,'SK Pemenang','winner_decree',$3,$4,$5,true,
             COALESCE((SELECT MAX(sort_order)+1 FROM event_documents WHERE event_site_id=$1),0))
           RETURNING id`,
          [
            eventId,
            title,
            input.fileType ?? 'PDF',
            input.displaySize ?? '',
            input.assetId,
          ],
        );
        documentId = documents[0].id as string;
      }
      await manager.query(
        `INSERT INTO event_detail_settings(event_site_id,decree_document_id,decree_title,decree_description)
         VALUES($1,$2,$3,$4)
         ON CONFLICT(event_site_id) DO UPDATE SET
           decree_document_id=COALESCE(EXCLUDED.decree_document_id,event_detail_settings.decree_document_id),
           decree_title=EXCLUDED.decree_title,
           decree_description=EXCLUDED.decree_description`,
        [eventId, documentId ?? null, title, description],
      );
      if (documentId) {
        const defaultTab = (
          await manager.query(
            `SELECT id FROM download_tabs WHERE event_site_id=$1 AND is_default=true AND is_active=true LIMIT 1`,
            [eventId],
          )
        )[0] ?? (
          await manager.query(
            `SELECT id FROM download_tabs WHERE event_site_id=$1 AND is_active=true ORDER BY sort_order,id LIMIT 1`,
            [eventId],
          )
        )[0];
        let tabId = defaultTab?.id;
        if (!tabId) {
          const newTabs = await manager.query(
            `INSERT INTO download_tabs(event_site_id,custom_tab_name,is_default,is_active,sort_order)
             VALUES($1,'',true,true,0)
             RETURNING id`,
            [eventId],
          );
          tabId = newTabs[0]?.id;
        }
        if (tabId)
          await manager.query(
            `INSERT INTO download_document_settings(download_tab_id,document_id,event_site_id,is_visible,label_override,sort_order)
             VALUES($1,$2,$3,true,'',COALESCE((SELECT MAX(sort_order)+1 FROM download_document_settings WHERE download_tab_id=$1),0))
             ON CONFLICT(download_tab_id,document_id) DO UPDATE SET is_visible=true`,
            [tabId, documentId, eventId],
          );
      }
      await manager.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes)
         VALUES($1,$2,'update','winner_decree',$1,$3)`,
        [
          eventId,
          userId,
          JSON.stringify({ documentId: documentId ?? null, title }),
        ],
      );
    });
    return this.decree(eventId, userId);
  }

  async list(table: Table, eventId: string, userId: string) {
    await this.eventAccess(eventId, userId, false);
    const columns = {
      event_documents: `id,title,category,document_role AS "documentRole",file_type AS "fileType",display_size AS "displaySize",asset_id AS "assetId",is_active AS "isActive",sort_order AS "sortOrder"`,
      winner_categories: `id,name,rank_prefix AS "rankPrefix",icon,is_active AS "isActive",sort_order AS "sortOrder"`,
      winners: `id,category_id AS "categoryId",display_mode AS "displayMode",design_asset_id AS "designAssetId",full_name AS "fullName",rank_label AS "rankLabel",school,exam_number AS "examNumber",district,regency,province,photo_asset_id AS "photoAssetId",is_active AS "isActive",sort_order AS "sortOrder"`,
    }[table];
    const rows = await this.db.query(
      `SELECT ${columns} FROM ${table} WHERE event_site_id=$1 ORDER BY sort_order,id`,
      [eventId],
    );
    return { data: rows, errors: [] };
  }

  async createDocument(e: string, u: string, d: Doc) {
    return this.write(e, u, 'create', 'document', async (m) => {
      await this.assetOwnership(d.assetId, e, m);
      return (
        await m.query(
          `INSERT INTO event_documents(event_site_id,title,category,document_role,file_type,display_size,asset_id,is_active,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [
            e,
            d.title.trim(),
            d.category ?? 'Dokumen',
            d.documentRole ?? '',
            d.fileType ?? 'PDF',
            d.displaySize ?? '',
            d.assetId ?? null,
            d.isActive ?? true,
            d.sortOrder ?? 0,
          ],
        )
      )[0];
    });
  }
  async updateDocument(e: string, id: string, u: string, d: Doc) {
    return this.write(
      e,
      u,
      'update',
      'document',
      async (m) => {
        await this.assetOwnership(d.assetId, e, m);
        return (
          await m.query(
            `UPDATE event_documents SET title=$3,category=$4,document_role=$5,file_type=$6,display_size=$7,asset_id=$8,is_active=$9,sort_order=$10 WHERE id=$1 AND event_site_id=$2 RETURNING *`,
            [
              id,
              e,
              d.title.trim(),
              d.category ?? 'Dokumen',
              d.documentRole ?? '',
              d.fileType ?? 'PDF',
              d.displaySize ?? '',
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
  async createWinnerCategory(e: string, u: string, d: Cat) {
    return this.write(
      e,
      u,
      'create',
      'winner_category',
      async (m) =>
        (
          await m.query(
            `INSERT INTO winner_categories(event_site_id,name,rank_prefix,icon,is_active,sort_order) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
            [
              e,
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
  async updateWinnerCategory(e: string, id: string, u: string, d: Cat) {
    return this.write(
      e,
      u,
      'update',
      'winner_category',
      async (m) =>
        (
          await m.query(
            `UPDATE winner_categories SET name=$3,rank_prefix=$4,icon=$5,is_active=$6,sort_order=$7 WHERE id=$1 AND event_site_id=$2 RETURNING *`,
            [
              id,
              e,
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
  async createWinner(e: string, u: string, d: Win) {
    return this.write(e, u, 'create', 'winner', async (m) => {
      const state = await this.winnerState(d, undefined, e, m);
      return (
        await m.query(
          `INSERT INTO winners(event_site_id,category_id,full_name,rank_label,school,exam_number,district,regency,province,photo_asset_id,design_asset_id,display_mode,is_active,sort_order)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           RETURNING id,category_id AS "categoryId",display_mode AS "displayMode",design_asset_id AS "designAssetId",full_name AS "fullName",rank_label AS "rankLabel",school,exam_number AS "examNumber",district,regency,province,photo_asset_id AS "photoAssetId",is_active AS "isActive",sort_order AS "sortOrder"`,
          this.winnerParams(e, state),
        )
      )[0];
    });
  }

  async updateWinner(e: string, id: string, u: string, d: Win) {
    return this.write(
      e,
      u,
      'update',
      'winner',
      async (m) => {
        const rows = await m.query(
          `SELECT id,category_id AS "categoryId",display_mode AS "displayMode",design_asset_id AS "designAssetId",full_name AS "fullName",rank_label AS "rankLabel",school,exam_number AS "examNumber",district,regency,province,photo_asset_id AS "photoAssetId",is_active AS "isActive",sort_order AS "sortOrder"
             FROM winners WHERE id=$1 AND event_site_id=$2 FOR UPDATE`,
          [id, e],
        );
        if (!rows[0]) throw new NotFoundException('Winner not found');
        const state = await this.winnerState(d, rows[0], e, m);
        return (
          await m.query(
            `UPDATE winners
                SET category_id=$3,full_name=$4,rank_label=$5,school=$6,exam_number=$7,district=$8,regency=$9,province=$10,photo_asset_id=$11,design_asset_id=$12,display_mode=$13,is_active=$14,sort_order=$15
              WHERE id=$1 AND event_site_id=$2
              RETURNING id,category_id AS "categoryId",display_mode AS "displayMode",design_asset_id AS "designAssetId",full_name AS "fullName",rank_label AS "rankLabel",school,exam_number AS "examNumber",district,regency,province,photo_asset_id AS "photoAssetId",is_active AS "isActive",sort_order AS "sortOrder"`,
            [id, ...this.winnerParams(e, state)],
          )
        )[0];
      },
      id,
    );
  }

  async deleteWinner(e: string, id: string, u: string) {
    return this.write(
      e,
      u,
      'delete',
      'winner',
      async (m) => {
        const winners = (await m.query(
          `SELECT winner.id,winner.category_id AS "categoryId",category.rank_prefix AS "rankPrefix",winner.rank_label AS "rankLabel",winner.sort_order AS "sortOrder",winner.is_active AS "isActive"
             FROM winners winner
             JOIN winner_categories category
               ON category.id=winner.category_id
              AND category.event_site_id=winner.event_site_id
            WHERE winner.event_site_id=$1
              AND winner.category_id=(SELECT category_id FROM winners WHERE id=$2 AND event_site_id=$1)
            ORDER BY winner.sort_order,winner.id
            FOR UPDATE OF winner`,
          [e, id],
        )) as WinnerOrderRow[];
        if (!winners.some((winner) => winner.id === id))
          throw new NotFoundException('Winner not found');

        await m.query(
          `DELETE FROM winners WHERE id=$1 AND event_site_id=$2 RETURNING id`,
          [id, e],
        );

        const remaining = winners.filter((winner) => winner.id !== id);
        for (const [newIndex, winner] of remaining.entries()) {
          const oldIndex = winners.indexOf(winner);
          const oldAutomaticLabel = `${winner.rankPrefix || 'Juara'} ${oldIndex + 1}`;
          const rankLabel =
            winner.rankLabel === oldAutomaticLabel
              ? `${winner.rankPrefix || 'Juara'} ${newIndex + 1}`
              : winner.rankLabel;
          await m.query(
            `UPDATE winners SET sort_order=$3,rank_label=$4 WHERE id=$1 AND event_site_id=$2 RETURNING id`,
            [winner.id, e, newIndex, rankLabel],
          );
        }

        return { id, categoryId: winners[0].categoryId };
      },
      id,
    );
  }

  async remove(table: Table, e: string, id: string, u: string) {
    return this.write(
      e,
      u,
      'delete',
      table,
      async (m) => {
        const result = await m.query(
          `DELETE FROM ${table} WHERE id=$1 AND event_site_id=$2 RETURNING id`,
          [id, e],
        );
        return result[0];
      },
      id,
    );
  }

  async page(eventId: string, pageType: string, userId: string) {
    await this.eventAccess(eventId, userId, false);
    const [rows, winnerSettings] = await Promise.all([
      this.db.query(
        `SELECT page_type AS "pageType",is_active AS "isActive",eyebrow,title,description,alignment FROM page_settings WHERE event_site_id=$1 AND page_type=$2`,
        [eventId, pageType],
      ),
      pageType === 'winners'
        ? this.db.query(
            `SELECT show_decree AS "showDecree",metadata_visibility AS "metadataVisibility",archive_active AS "archiveActive",archive_limit AS "archiveLimit" FROM winner_page_settings WHERE event_site_id=$1`,
            [eventId],
          )
        : Promise.resolve([]),
    ]);
    const page = rows[0] ?? null;
    return {
      data:
        pageType === 'winners'
          ? { ...(page ?? {}), ...(winnerSettings[0] ?? {}) }
          : page,
      errors: [],
    };
  }
  async putPage(eventId: string, pageType: string, userId: string, d: Page) {
    await this.eventAccess(eventId, userId, true);
    await this.db.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO page_settings(event_site_id,page_type,is_active,eyebrow,title,description,alignment) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(event_site_id,page_type) DO UPDATE SET is_active=EXCLUDED.is_active,eyebrow=EXCLUDED.eyebrow,title=EXCLUDED.title,description=EXCLUDED.description,alignment=EXCLUDED.alignment`,
        [
          eventId,
          pageType,
          d.isActive ?? true,
          d.eyebrow ?? '',
          d.title ?? '',
          d.description ?? '',
          d.alignment ?? 'center',
        ],
      );
      if (pageType === 'winners')
        await manager.query(
          `INSERT INTO winner_page_settings(event_site_id,is_active,show_decree,metadata_visibility,archive_active,archive_limit) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(event_site_id) DO UPDATE SET is_active=EXCLUDED.is_active,show_decree=EXCLUDED.show_decree,metadata_visibility=EXCLUDED.metadata_visibility,archive_active=EXCLUDED.archive_active,archive_limit=EXCLUDED.archive_limit`,
          [
            eventId,
            d.isActive ?? true,
            d.showDecree ?? true,
            d.metadataVisibility ?? {},
            d.archiveActive ?? true,
            Math.max(0, Math.min(12, d.archiveLimit ?? 3)),
          ],
        );
    });
    return this.page(eventId, pageType, userId);
  }

  private async winnerState(
    input: Win,
    existing: WinnerState | undefined,
    eventId: string,
    manager: any,
  ): Promise<WinnerState> {
    const has = (key: keyof Win) =>
      Object.prototype.hasOwnProperty.call(input, key);
    const value = <K extends keyof Win>(key: K): Win[K] | undefined =>
      has(key) ? input[key] : existing?.[key];
    const categoryId = value('categoryId');
    if (!categoryId)
      throw new BadRequestException('Winner category is required');

    const categories = await manager.query(
      `SELECT id FROM winner_categories WHERE id=$1 AND event_site_id=$2`,
      [categoryId, eventId],
    );
    if (!categories[0])
      throw new NotFoundException('Winner category does not belong to event');

    const displayMode = value('displayMode') ?? 'built_in';
    if (displayMode !== 'built_in' && displayMode !== 'custom')
      throw new BadRequestException('Invalid winner display mode');

    const rankLabel = this.trimmed(value('rankLabel')) ?? '';
    const isActive = value('isActive') ?? true;
    const sortOrder = value('sortOrder') ?? 0;

    if (displayMode === 'custom') {
      const designAssetId = value('designAssetId') ?? null;
      if (!designAssetId)
        throw new BadRequestException('Custom mode requires designAssetId');
      await this.customDesignAsset(designAssetId, eventId, manager);
      return {
        categoryId,
        displayMode,
        designAssetId,
        fullName: null,
        rankLabel,
        school: null,
        examNumber: null,
        district: null,
        regency: null,
        province: null,
        photoAssetId: null,
        isActive,
        sortOrder,
      };
    }

    const fullName = this.trimmed(value('fullName'));
    if (!fullName)
      throw new BadRequestException('Built-in mode requires fullName');
    const photoAssetId = value('photoAssetId') ?? null;
    await this.assetOwnership(photoAssetId ?? undefined, eventId, manager);
    return {
      categoryId,
      displayMode,
      designAssetId: null,
      fullName,
      rankLabel,
      school: this.trimmed(value('school')),
      examNumber: this.trimmed(value('examNumber')),
      district: this.trimmed(value('district')),
      regency: this.trimmed(value('regency')),
      province: this.trimmed(value('province')),
      photoAssetId,
      isActive,
      sortOrder,
    };
  }

  private winnerParams(eventId: string, state: WinnerState) {
    return [
      eventId,
      state.categoryId,
      state.fullName,
      state.rankLabel,
      state.school,
      state.examNumber,
      state.district,
      state.regency,
      state.province,
      state.photoAssetId,
      state.designAssetId,
      state.displayMode,
      state.isActive,
      state.sortOrder,
    ];
  }

  private trimmed(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const result = String(value).trim();
    return result || null;
  }

  private async customDesignAsset(assetId: string, eventId: string, m: any) {
    const rows = await m.query(
      `SELECT asset.mime_type AS "mimeType",asset.byte_size AS "byteSize",asset.status
         FROM media_assets asset
         JOIN event_sites event ON event.id=$2
        WHERE asset.id=$1 AND asset.organization_id=event.organization_id`,
      [assetId, eventId],
    );
    if (!rows[0])
      throw new ForbiddenException('Media asset ownership mismatch');
    if (rows[0].status !== 'active')
      throw new BadRequestException('Design asset must be active');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(rows[0].mimeType))
      throw new BadRequestException('Design must be JPG, PNG, or WebP');
    if (BigInt(rows[0].byteSize) > 2_097_152n)
      throw new BadRequestException('Design file must not exceed 2 MB');
  }

  private async write(
    e: string,
    u: string,
    action: string,
    type: string,
    operation: (m: any) => Promise<any>,
    id?: string,
  ) {
    await this.eventAccess(e, u, true);
    return this.db.transaction(async (m) => {
      const row = await operation(m);
      if (!row) throw new NotFoundException('Resource not found');
      await m.query(
        `INSERT INTO audit_logs(event_site_id,actor_user_id,action,entity_type,entity_id,changes) VALUES($1,$2,$3,$4,$5,'{}')`,
        [e, u, action, type, id ?? row.id],
      );
      return { data: row, errors: [] };
    });
  }
  private async eventAccess(e: string, u: string, write: boolean) {
    const roles = write
      ? `AND membership.role IN ('owner','admin','editor')`
      : '';
    const rows = await this.db.query(
      `SELECT event.id FROM event_sites event JOIN organization_memberships membership ON membership.organization_id=event.organization_id WHERE event.id=$1 AND membership.user_id=$2 AND event.deleted_at IS NULL ${roles}`,
      [e, u],
    );
    if (!rows[0]) throw new ForbiddenException('Event access denied');
  }
  private async assetOwnership(asset: string | undefined, e: string, m: any) {
    if (!asset) return;
    const rows = await m.query(
      `SELECT 1 FROM media_assets asset JOIN event_sites event ON event.id=$2 WHERE asset.id=$1 AND asset.organization_id=event.organization_id`,
      [asset, e],
    );
    if (!rows[0])
      throw new ForbiddenException('Media asset ownership mismatch');
  }
}
