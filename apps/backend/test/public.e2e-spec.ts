import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { createHash } from 'node:crypto';
import { canonicalJson } from '../src/admin/event-publication.service';
import { AppModule } from '../src/app.module';
import { PublicContentService } from '../src/public/public-content.service';
import { WorkspaceSnapshotService } from '../src/public/workspace-snapshot.service';

describe('Public Category → active Event visibility (e2e)', () => {
  let app: INestApplication<App>;
  let db: Client;
  let organizationId: string;
  let categoryId: string;
  let activeEventId: string;
  let archivedEventId: string;
  const suffix = Date.now().toString();
  const categorySlug = `public-${suffix}`;
  const hostname = `${categorySlug}.localhost`;

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
      `INSERT INTO organizations(name,slug) VALUES('Public Test',$1) RETURNING id`,
      [categorySlug],
    );
    organizationId = organization.rows[0].id;
    const category = await db.query<{ id: string }>(
      `INSERT INTO competition_categories(
         organization_id,name,slug,organizer_name,publication_status,published_at
       ) VALUES($1,'Public Category',$2,'Public Organizer','published',now()) RETURNING id`,
      [organizationId, categorySlug],
    );
    categoryId = category.rows[0].id;
    const activeEvent = await db.query<{ id: string }>(
      `INSERT INTO event_sites(category_id,organization_id,name,slug,is_active,description)
       VALUES($1,$2,'Public Active Event','2026',true,'Active description') RETURNING id`,
      [categoryId, organizationId],
    );
    activeEventId = activeEvent.rows[0].id;
    const archivedEvent = await db.query<{ id: string }>(
      `INSERT INTO event_sites(category_id,organization_id,name,slug,is_active,description)
       VALUES($1,$2,'Public Archived Event','2025',false,'Archive description') RETURNING id`,
      [categoryId, organizationId],
    );
    archivedEventId = archivedEvent.rows[0].id;
    await db.query(
      `INSERT INTO site_domains(category_id,hostname,is_primary) VALUES($1,$2,true)`,
      [categoryId, hostname],
    );
    await db.query(
      `INSERT INTO site_settings(event_site_id,primary_color,navigation)
       VALUES($1,'#123456','{"home":true}'),($2,'#654321','{}')`,
      [activeEventId, archivedEventId],
    );
    await db.query(
      `INSERT INTO home_sections(event_site_id,section_type,is_active,sort_order,settings)
       VALUES($1,'hero',true,1,'{"title":"Visible"}'),($1,'pricing',false,2,'{}')`,
      [activeEventId],
    );
    await db.query(
      `INSERT INTO event_documents(event_site_id,title) VALUES($1,'Archive Document')`,
      [archivedEventId],
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
    const executor = {
      query: async <T>(sql: string, parameters?: unknown[]) =>
        (await db.query(sql, parameters)).rows as T,
    };
    const content = new PublicContentService(executor as never);
    const workspace = new WorkspaceSnapshotService(executor as never);
    for (const eventId of [activeEventId, archivedEventId]) {
      const [publicSnapshot, workspaceSnapshot] = await Promise.all([
        content.build(eventId, executor),
        workspace.capture(eventId, executor),
      ]);
      await db.query(
        `INSERT INTO event_publications(
           event_site_id,organization_id,category_id,public_snapshot,workspace_snapshot,workspace_checksum
         ) VALUES($1,$2,$3,$4,$5,$6)`,
        [
          eventId,
          organizationId,
          categoryId,
          publicSnapshot,
          workspaceSnapshot,
          createHash('sha256')
            .update(canonicalJson(workspaceSnapshot))
            .digest('hex'),
        ],
      );
    }
  });

  it('hides an unverified hostname', () =>
    request(app.getHttpServer())
      .get(`/api/v1/public/sites/by-host/${hostname}/bootstrap`)
      .expect(404));

  it('returns category and active event for a verified hostname', async () => {
    await db.query(
      `UPDATE site_domains SET verified_at=now() WHERE category_id=$1`,
      [categoryId],
    );
    const response = await request(app.getHttpServer())
      .get(`/api/v1/public/sites/by-host/${hostname}/bootstrap`)
      .expect(200);
    expect(response.body.data.site).toEqual(
      expect.objectContaining({ slug: categorySlug, name: 'Public Category' }),
    );
    expect(response.body.data.settings.primaryColor).toBe('#123456');
    expect(response.body.data.currentEvent).toEqual(
      expect.objectContaining({ slug: '2026', name: 'Public Active Event' }),
    );
  });

  it('returns active home sections and automatic archives only', async () => {
    const home = await request(app.getHttpServer())
      .get(`/api/v1/public/sites/${categorySlug}/home`)
      .expect(200);
    expect(home.body.data.sections).toEqual([
      expect.objectContaining({ type: 'hero' }),
    ]);

    const archives = await request(app.getHttpServer())
      .get(`/api/v1/public/sites/${categorySlug}/archives`)
      .expect(200);
    expect(archives.body.data.events).toEqual([
      expect.objectContaining({ slug: '2025', name: 'Public Archived Event' }),
    ]);
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/public/sites/${categorySlug}/archives/2025`)
      .expect(200);
    expect(detail.body.data.documents).toEqual([
      expect.objectContaining({ title: 'Archive Document' }),
    ]);
  });

  it('hides a suspended active event', async () => {
    await db.query(`UPDATE event_sites SET status='suspended' WHERE id=$1`, [
      activeEventId,
    ]);
    await request(app.getHttpServer())
      .get(`/api/v1/public/sites/${categorySlug}/home`)
      .expect(404);
  });

  afterAll(async () => {
    try {
      if (organizationId)
        await db.query(`DELETE FROM organizations WHERE id=$1`, [
          organizationId,
        ]);
    } finally {
      await app?.close();
      await db?.end();
    }
  });
});
