import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { QueryExecutor } from './public-content.service';

export interface WorkspaceSnapshot {
  schemaVersion: 1;
  eventId: string;
  rows: Record<string, Record<string, unknown>[]>;
}

type TableSpec = {
  table: string;
  where: string;
  order: string;
};

const TABLES: TableSpec[] = [
  {
    table: 'site_settings',
    where: 'row.event_site_id=$1',
    order: 'row.event_site_id',
  },
  {
    table: 'event_documents',
    where: 'row.event_site_id=$1',
    order: 'row.sort_order,row.id',
  },
  {
    table: 'winner_categories',
    where: 'row.event_site_id=$1',
    order: 'row.sort_order,row.id',
  },
  {
    table: 'winners',
    where: 'row.event_site_id=$1',
    order: 'row.sort_order,row.id',
  },
  {
    table: 'event_detail_settings',
    where: 'row.event_site_id=$1',
    order: 'row.event_site_id',
  },
  {
    table: 'archive_category_settings',
    where: 'row.event_site_id=$1',
    order: 'row.sort_order,row.category_id',
  },
  {
    table: 'archive_document_settings',
    where: 'row.event_site_id=$1',
    order: 'row.sort_order,row.document_id',
  },
  {
    table: 'page_settings',
    where: 'row.event_site_id=$1',
    order: 'row.page_type',
  },
  {
    table: 'winner_page_settings',
    where: 'row.event_site_id=$1',
    order: 'row.event_site_id',
  },
  {
    table: 'home_sections',
    where: 'row.event_site_id=$1',
    order: 'row.sort_order,row.id',
  },
  {
    table: 'hero_badges',
    where:
      'EXISTS (SELECT 1 FROM home_sections section WHERE section.id=row.section_id AND section.event_site_id=$1)',
    order: 'row.sort_order,row.id',
  },
  {
    table: 'hero_actions',
    where:
      'EXISTS (SELECT 1 FROM home_sections section WHERE section.id=row.section_id AND section.event_site_id=$1)',
    order: 'row.sort_order,row.id',
  },
  {
    table: 'schedule_items',
    where:
      'EXISTS (SELECT 1 FROM home_sections section WHERE section.id=row.section_id AND section.event_site_id=$1)',
    order: 'row.sort_order,row.id',
  },
  {
    table: 'pricing_packages',
    where:
      'EXISTS (SELECT 1 FROM home_sections section WHERE section.id=row.section_id AND section.event_site_id=$1)',
    order: 'row.sort_order,row.id',
  },
  {
    table: 'pricing_facilities',
    where: `EXISTS (SELECT 1 FROM pricing_packages package JOIN home_sections section ON section.id=package.section_id WHERE package.id=row.package_id AND section.event_site_id=$1)`,
    order: 'row.sort_order,row.id',
  },
  {
    table: 'benefit_items',
    where:
      'EXISTS (SELECT 1 FROM home_sections section WHERE section.id=row.section_id AND section.event_site_id=$1)',
    order: 'row.sort_order,row.id',
  },
  {
    table: 'partner_items',
    where:
      'EXISTS (SELECT 1 FROM home_sections section WHERE section.id=row.section_id AND section.event_site_id=$1)',
    order: 'row.sort_order,row.id',
  },
  {
    table: 'download_tabs',
    where: 'row.event_site_id=$1',
    order: 'row.sort_order,row.id',
  },
  {
    table: 'download_document_settings',
    where: 'row.event_site_id=$1',
    order: 'row.sort_order,row.download_tab_id,row.document_id',
  },
  {
    table: 'faq_categories',
    where: 'row.event_site_id=$1',
    order: 'row.sort_order,row.id',
  },
  {
    table: 'faq_questions',
    where:
      'EXISTS (SELECT 1 FROM faq_categories category WHERE category.id=row.category_id AND category.event_site_id=$1)',
    order: 'row.sort_order,row.id',
  },
];

@Injectable()
export class WorkspaceSnapshotService {
  constructor(private readonly db: DataSource) {}

  async capture(
    eventId: string,
    executor: QueryExecutor = this.db,
  ): Promise<WorkspaceSnapshot> {
    const events = await executor.query<Record<string, unknown>[]>(
      `SELECT id,name,description,logo_asset_id,mascot_asset_id,fallback_icon FROM event_sites WHERE id=$1 AND deleted_at IS NULL`,
      [eventId],
    );
    if (!events[0]) throw new BadRequestException('Event workspace not found');
    const rows: WorkspaceSnapshot['rows'] = { event_sites: [events[0]] };
    for (const spec of TABLES) {
      const result = await executor.query<
        Array<{ rows: Record<string, unknown>[] }>
      >(
        `SELECT COALESCE(jsonb_agg(to_jsonb(item) ORDER BY ${spec.order.replaceAll('row.', 'item.')}),'[]'::jsonb) AS rows
         FROM (SELECT row.* FROM ${spec.table} row WHERE ${spec.where}) item`,
        [eventId],
      );
      rows[spec.table] = result[0]?.rows ?? [];
    }
    return { schemaVersion: 1, eventId, rows };
  }

  async restore(
    eventId: string,
    snapshot: WorkspaceSnapshot,
    executor: QueryExecutor,
  ) {
    if (snapshot.schemaVersion !== 1 || snapshot.eventId !== eventId)
      throw new BadRequestException('Workspace snapshot does not match Event');

    for (const spec of [...TABLES].reverse())
      await executor.query(
        `DELETE FROM ${spec.table} row WHERE ${spec.where}`,
        [eventId],
      );

    const event = snapshot.rows.event_sites?.[0];
    if (!event)
      throw new BadRequestException('Workspace snapshot is incomplete');
    const hasLogo = Object.prototype.hasOwnProperty.call(
      event,
      'logo_asset_id',
    );
    await executor.query(
      `UPDATE event_sites SET name=$2,description=$3,mascot_asset_id=$4,fallback_icon=$5,logo_asset_id=CASE WHEN $6 THEN $7::uuid ELSE logo_asset_id END,version=version+1,updated_at=now() WHERE id=$1`,
      [
        eventId,
        event.name,
        event.description,
        event.mascot_asset_id,
        event.fallback_icon,
        hasLogo,
        event.logo_asset_id ?? null,
      ],
    );

    for (const spec of TABLES) {
      let rows = snapshot.rows[spec.table] ?? [];
      if (spec.table === 'site_settings' && rows.length) {
        rows = rows.map((row) => ({
          ...row,
          navbar_logo_size: row.navbar_logo_size ?? 36,
        }));
      }
      if (rows.length)
        await executor.query(
          `INSERT INTO ${spec.table} SELECT * FROM jsonb_populate_recordset(NULL::${spec.table},$1::jsonb)`,
          [JSON.stringify(rows)],
        );
    }
  }
}
