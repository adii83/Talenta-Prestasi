import 'dotenv/config';
import { hash } from 'bcrypt';
import { createHash } from 'node:crypto';
import { Client } from 'pg';
import {
  canonicalJson,
  collectAssetIds,
} from '../admin/event-publication.service';
import { PublicContentService } from '../public/public-content.service';
import { WorkspaceSnapshotService } from '../public/workspace-snapshot.service';

async function main() {
  const email = process.env.LOCAL_ADMIN_EMAIL;
  const password = process.env.LOCAL_ADMIN_PASSWORD;
  const publicBaseDomain = (
    process.env.PUBLIC_BASE_DOMAIN || 'nexaplaymetadata.online'
  )
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, '');
  if (!email || !password || password.length < 12)
    throw new Error(
      'Set LOCAL_ADMIN_EMAIL and LOCAL_ADMIN_PASSWORD (minimum 12 characters) before seeding',
    );

  const db = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  await db.connect();
  try {
    await db.query('BEGIN');
    const organization = await db.query<{ id: string }>(
      `INSERT INTO organizations(name,slug,status)
       VALUES('Talenta Prestasi Local','talenta-prestasi-local','active')
       ON CONFLICT(slug) DO UPDATE SET status='active',deleted_at=NULL
       RETURNING id`,
    );
    const organizationId = organization.rows[0].id;
    const category = await db.query<{ id: string }>(
      `INSERT INTO competition_categories(
         organization_id,name,slug,organizer_name,status,publication_status,published_at
       ) VALUES($1,'Talenta Prestasi Local','talenta-prestasi-local','Talenta Prestasi','active','published',now())
       ON CONFLICT(organization_id,slug) WHERE deleted_at IS NULL
       DO UPDATE SET name=EXCLUDED.name,organizer_name=EXCLUDED.organizer_name,
         status='active',publication_status='published',
         published_at=COALESCE(competition_categories.published_at,now())
       RETURNING id`,
      [organizationId],
    );
    const categoryId = category.rows[0].id;

    const activeEvent = await db.query<{ id: string }>(
      `INSERT INTO event_sites(
         category_id,organization_id,name,slug,period_year,activated_at,is_active,status,description
       ) VALUES($1,$2,'Talenta Prestasi Local','2026',2026,now(),false,'active','Event aktif lokal')
       ON CONFLICT(category_id,slug) WHERE deleted_at IS NULL
       DO UPDATE SET name=EXCLUDED.name,period_year=EXCLUDED.period_year,
         activated_at=COALESCE(event_sites.activated_at,now()),status='active',
         description=EXCLUDED.description,deleted_at=NULL
       RETURNING id`,
      [categoryId, organizationId],
    );
    const archivedEvent = await db.query<{ id: string }>(
      `INSERT INTO event_sites(
         category_id,organization_id,name,slug,period_year,activated_at,is_active,status,description
       ) VALUES($1,$2,'Talenta Prestasi Local','2025',2025,now(),false,'active','Event arsip lokal')
       ON CONFLICT(category_id,slug) WHERE deleted_at IS NULL
       DO UPDATE SET name=EXCLUDED.name,period_year=EXCLUDED.period_year,
         activated_at=COALESCE(event_sites.activated_at,now()),is_active=false,status='active',
         description=EXCLUDED.description,deleted_at=NULL
       RETURNING id`,
      [categoryId, organizationId],
    );
    await db.query(
      `UPDATE event_sites SET is_active=(id=$2),updated_at=now()
       WHERE category_id=$1 AND deleted_at IS NULL`,
      [categoryId, activeEvent.rows[0].id],
    );
    await db.query(
      `INSERT INTO site_settings(event_site_id)
       VALUES($1),($2) ON CONFLICT(event_site_id) DO NOTHING`,
      [activeEvent.rows[0].id, archivedEvent.rows[0].id],
    );

    const hostname = `talenta-prestasi-local.${publicBaseDomain}`;
    await db.query(
      `DELETE FROM site_domains domain
       USING competition_categories category
       WHERE domain.hostname=$1 AND domain.category_id=category.id
         AND category.deleted_at IS NOT NULL`,
      [hostname],
    );
    const primaryDomain = await db.query(
      `UPDATE site_domains SET hostname=$2,is_primary=true,verified_at=now()
       WHERE category_id=$1 AND is_primary=true`,
      [categoryId, hostname],
    );
    if (primaryDomain.rowCount === 0)
      await db.query(
        `INSERT INTO site_domains(category_id,hostname,is_primary,verified_at)
         VALUES($1,$2,true,now())`,
        [categoryId, hostname],
      );

    const user = await db.query<{ id: string }>(
      `INSERT INTO users(email,password_hash,status)
       VALUES($1,$2,'active')
       ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,status='active'
       RETURNING id`,
      [email.toLowerCase(), await hash(password, 10)],
    );
    await db.query(
      `INSERT INTO organization_memberships(organization_id,user_id,role)
       VALUES($1,$2,'owner')
       ON CONFLICT(organization_id,user_id) DO UPDATE SET role='owner'`,
      [organizationId, user.rows[0].id],
    );
    const executor = {
      query: async <T>(sql: string, parameters?: unknown[]) =>
        (await db.query(sql, parameters)).rows as T,
    };
    const publicContent = new PublicContentService(executor as never);
    const workspace = new WorkspaceSnapshotService(executor as never);
    for (const eventId of [activeEvent.rows[0].id, archivedEvent.rows[0].id]) {
      const publicSnapshot = await publicContent.build(eventId, executor);
      const workspaceSnapshot = await workspace.capture(eventId, executor);
      const checksum = createHash('sha256')
        .update(canonicalJson(workspaceSnapshot))
        .digest('hex');
      await db.query(
        `INSERT INTO event_publications(
           event_site_id,organization_id,category_id,version,schema_version,
           public_snapshot,workspace_snapshot,workspace_checksum,published_at,published_by
         ) VALUES($1,$2,$3,1,1,$4,$5,$6,now(),$7)
         ON CONFLICT(event_site_id) DO UPDATE SET
           public_snapshot=EXCLUDED.public_snapshot,workspace_snapshot=EXCLUDED.workspace_snapshot,
           workspace_checksum=EXCLUDED.workspace_checksum,published_at=now(),published_by=EXCLUDED.published_by`,
        [
          eventId,
          organizationId,
          categoryId,
          publicSnapshot,
          workspaceSnapshot,
          checksum,
          user.rows[0].id,
        ],
      );
      await db.query(
        `DELETE FROM event_publication_assets WHERE event_site_id=$1`,
        [eventId],
      );
      const assetIds = collectAssetIds(publicSnapshot);
      if (assetIds.length)
        await db.query(
          `INSERT INTO event_publication_assets(event_site_id,asset_id)
           SELECT $1,asset.id FROM media_assets asset
           WHERE asset.id=ANY($2::uuid[]) AND asset.organization_id=$3 AND asset.status='active'`,
          [eventId, assetIds, organizationId],
        );
    }
    await db.query('COMMIT');
    console.log(
      JSON.stringify({
        seeded: true,
        categoryId,
        activeEventId: activeEvent.rows[0].id,
        archivedEventId: archivedEvent.rows[0].id,
      }),
    );
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    await db.end();
  }
}

void main();
