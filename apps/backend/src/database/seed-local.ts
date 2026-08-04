import 'dotenv/config';
import { hash } from 'bcrypt';
import { Client } from 'pg';

async function main() {
  const email = process.env.LOCAL_ADMIN_EMAIL;
  const password = process.env.LOCAL_ADMIN_PASSWORD;
  const publicBaseDomain = (
    process.env.PUBLIC_BASE_DOMAIN || 'nexaplaymetadata.online'
  )
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, '');
  if (!email || !password || password.length < 12) {
    throw new Error(
      'Set LOCAL_ADMIN_EMAIL and LOCAL_ADMIN_PASSWORD (minimum 12 characters) before seeding',
    );
  }
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
    const org = await db.query<{ id: string }>(
      `INSERT INTO organizations(name,slug,status) VALUES('Talenta Prestasi Local','talenta-prestasi-local','active') ON CONFLICT(slug) DO UPDATE SET status='active',deleted_at=NULL RETURNING id`,
    );
    const organizationId = org.rows[0].id;
    const site = await db.query<{ id: string }>(
      `INSERT INTO event_sites(organization_id,name,slug,organizer_name,status,publication_status,published_at) VALUES($1,'Talenta Prestasi Local','talenta-prestasi-local','Talenta Prestasi','active','published',now()) ON CONFLICT(organization_id,slug) DO UPDATE SET status='active',publication_status='published',published_at=COALESCE(event_sites.published_at,now()),deleted_at=NULL RETURNING id`,
      [organizationId],
    );
    const siteId = site.rows[0].id;
    await db.query(
      `INSERT INTO site_settings(event_site_id) VALUES($1) ON CONFLICT(event_site_id) DO NOTHING`,
      [siteId],
    );
    const domain = await db.query(
      `UPDATE site_domains SET hostname=$2,is_primary=true,verified_at=now() WHERE event_site_id=$1 AND is_primary=true`,
      [siteId, `talenta-prestasi-local.${publicBaseDomain}`],
    );
    if (domain.rowCount === 0)
      await db.query(
        `INSERT INTO site_domains(event_site_id,hostname,is_primary,verified_at) VALUES($1,$2,true,now())`,
        [siteId, `talenta-prestasi-local.${publicBaseDomain}`],
      );
    const user = await db.query<{ id: string }>(
      `INSERT INTO users(email,password_hash,status) VALUES($1,$2,'active') ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,status='active' RETURNING id`,
      [email.toLowerCase(), await hash(password, 10)],
    );
    await db.query(
      `INSERT INTO organization_memberships(organization_id,user_id,role) VALUES($1,$2,'owner') ON CONFLICT(organization_id,user_id) DO UPDATE SET role='owner'`,
      [organizationId, user.rows[0].id],
    );
    await db.query('COMMIT');
    console.log(
      JSON.stringify({
        seeded: true,
        siteId,
        siteSlug: 'talenta-prestasi-local',
        email,
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
