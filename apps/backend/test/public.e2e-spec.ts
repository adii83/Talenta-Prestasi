import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Public API visibility (e2e)', () => {
  let app: INestApplication<App>;
  let db: Client;
  let organizationId: string;
  let siteId: string;
  const suffix = Date.now().toString();
  const slug = `public-${suffix}`;
  const hostname = `${slug}.localhost`;

  beforeAll(async () => {
    db = new Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });
    await db.connect();
    const organization = await db.query<{ id: string }>(
      `INSERT INTO organizations (name, slug) VALUES ('Public Test', $1) RETURNING id`,
      [slug],
    );
    organizationId = organization.rows[0].id;
    const site = await db.query<{ id: string }>(
      `INSERT INTO event_sites (organization_id, name, slug, publication_status, published_at) VALUES ($1, 'Public Site', $2, 'published', now()) RETURNING id`,
      [organizationId, slug],
    );
    siteId = site.rows[0].id;
    await db.query(
      `INSERT INTO site_domains (event_site_id, hostname, is_primary) VALUES ($1, $2, true)`,
      [siteId, hostname],
    );
    await db.query(
      `INSERT INTO site_settings (event_site_id, primary_color, navigation) VALUES ($1, '#123456', '{"home":true}')`,
      [siteId],
    );
    await db.query(
      `INSERT INTO competitions (event_site_id, name, slug, publication_status) VALUES ($1, 'Draft Competition', 'draft', 'draft')`,
      [siteId],
    );
    await db.query(
      `INSERT INTO home_sections (event_site_id, section_type, is_active, sort_order, settings) VALUES ($1, 'hero', true, 1, '{"title":"Visible"}'), ($1, 'pricing', false, 2, '{}')`,
      [siteId],
    );
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('hides an unverified hostname', () =>
    request(app.getHttpServer())
      .get(`/api/v1/public/sites/by-host/${hostname}/bootstrap`)
      .expect(404));

  it('returns only published bootstrap data for a verified hostname', async () => {
    await db.query(
      `UPDATE site_domains SET verified_at = now() WHERE event_site_id = $1`,
      [siteId],
    );
    const response = await request(app.getHttpServer())
      .get(`/api/v1/public/sites/by-host/${hostname}/bootstrap`)
      .expect(200);
    const body = response.body as {
      data: {
        site: { slug: string; organizationId?: string };
        settings: { primaryColor: string };
        currentCompetition: unknown;
      };
    };
    expect(body.data.site).toEqual(expect.objectContaining({ slug }));
    expect(body.data.settings.primaryColor).toBe('#123456');
    expect(body.data.currentCompetition).toBeNull();
    expect(body.data.site.organizationId).toBeUndefined();
  });

  it('returns active Home sections only', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/public/sites/${slug}/home`)
      .expect(200);
    const body = response.body as {
      data: { sections: Array<{ type: string }> };
    };
    expect(body.data.sections).toHaveLength(1);
    expect(body.data.sections[0].type).toBe('hero');
  });

  it('hides a suspended portal', async () => {
    await db.query(
      `UPDATE event_sites SET status = 'suspended' WHERE id = $1`,
      [siteId],
    );
    await request(app.getHttpServer())
      .get(`/api/v1/public/sites/${slug}/home`)
      .expect(404);
  });

  afterAll(async () => {
    if (organizationId)
      await db.query(`DELETE FROM organizations WHERE id = $1`, [
        organizationId,
      ]);
    await app?.close();
    await db?.end();
  });
});
