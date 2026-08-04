import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from 'bcrypt';
import { Client } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Admin tenant and locking (e2e)', () => {
  let app: INestApplication<App>;
  let db: Client;
  let organizationId: string;
  let otherOrganizationId: string;
  let siteId: string;
  let sourceEventId: string;
  let inheritedEventId: string;
  let ownerToken: string;
  let editorToken: string;
  let viewerToken: string;
  let outsiderToken: string;
  const suffix = Date.now().toString();

  async function createUser(email: string, organization: string, role: string) {
    const password = 'StrongPassword123!';
    const result = await db.query<{ id: string }>(
      `INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id`,
      [email, await hash(password, 4)],
    );
    await db.query(
      `INSERT INTO organization_memberships(organization_id,user_id,role) VALUES($1,$2,$3)`,
      [organization, result.rows[0].id, role],
    );
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);
    return (response.body as { access_token: string }).access_token;
  }

  beforeAll(async () => {
    db = new Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });
    await db.connect();
    const a = await db.query<{ id: string }>(
      `INSERT INTO organizations(name,slug) VALUES('Admin Test',$1) RETURNING id`,
      [`admin-${suffix}`],
    );
    organizationId = a.rows[0].id;
    const b = await db.query<{ id: string }>(
      `INSERT INTO organizations(name,slug) VALUES('Other Test',$1) RETURNING id`,
      [`other-${suffix}`],
    );
    otherOrganizationId = b.rows[0].id;
    const site = await db.query<{ id: string }>(
      `INSERT INTO event_sites(organization_id,name,slug,publication_status,published_at) VALUES($1,'Admin Site',$2,'published',now()) RETURNING id`,
      [organizationId, `admin-${suffix}`],
    );
    siteId = site.rows[0].id;
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
    ownerToken = await createUser(
      `owner-${suffix}@test.local`,
      organizationId,
      'owner',
    );
    editorToken = await createUser(
      `editor-${suffix}@test.local`,
      organizationId,
      'editor',
    );
    viewerToken = await createUser(
      `viewer-${suffix}@test.local`,
      organizationId,
      'viewer',
    );
    outsiderToken = await createUser(
      `outsider-${suffix}@test.local`,
      otherOrganizationId,
      'owner',
    );
  });

  it('requires authentication and tenant membership', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/admin/sites/${siteId}`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/v1/admin/sites/${siteId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403);
  });

  it('creates an event from its name only and exposes it in the session', async () => {
    const payload = { name: 'Event Sumber Arsip' };
    await request(app.getHttpServer())
      .post('/api/v1/admin/sites')
      .set('Authorization', `Bearer ${editorToken}`)
      .send(payload)
      .expect(403);
    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/sites')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(payload)
      .expect(201);
    const createdBody = created.body as {
      data: { id: string; currentCompetitionId: string };
    };
    const portal = createdBody.data;
    sourceEventId = portal.id;
    const settings = await db.query(
      `SELECT 1 FROM site_settings WHERE event_site_id=$1`,
      [portal.id],
    );
    expect(settings.rowCount).toBe(1);
    const session = await request(app.getHttpServer())
      .get('/api/v1/admin/session')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const sessionBody = session.body as { data: { sites: { id: string }[] } };
    expect(sessionBody.data.sites.some((item) => item.id === portal.id)).toBe(
      true,
    );
  });

  it('updates the event slug from the settings editor contract', async () => {
    const response = await request(app.getHttpServer())
      .put(`/api/v1/admin/sites/${sourceEventId}/settings`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        eventName: 'Event Sumber Arsip',
        eventSlug: `sumber-${suffix}`,
        organizerName: 'Admin Test',
        primaryColor: '#1e4b8c',
        navigation: {},
        contact: {},
        footer: {},
      })
      .expect(200);
    const body = response.body as { data: { eventSlug: string } };
    expect(body.data.eventSlug).toBe(`sumber-${suffix}`);
  });

  it('publishes and unpublishes an event only after its slug is configured', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/admin/sites/${sourceEventId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`)
      .expect(403);
    const published = await request(app.getHttpServer())
      .post(`/api/v1/admin/sites/${sourceEventId}/publish`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);
    const publishedBody = published.body as {
      data: { hostname: string; publicationStatus: string };
    };
    expect(publishedBody.data.publicationStatus).toBe('published');
    expect(publishedBody.data.hostname).toBe(
      `sumber-${suffix}.nexaplaymetadata.online`,
    );
    await request(app.getHttpServer())
      .get(`/api/v1/public/sites/sumber-${suffix}/bootstrap`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/sites/${sourceEventId}/unpublish`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .get(`/api/v1/public/sites/sumber-${suffix}/bootstrap`)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/sites/${sourceEventId}/publish`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);
  });

  it('inherits previous event archives with documents and winners', async () => {
    const previous = await db.query<{ id: string }>(
      `SELECT id FROM competitions WHERE event_site_id=$1 AND lifecycle='current'`,
      [sourceEventId],
    );
    const document = await db.query<{ id: string }>(
      `INSERT INTO competition_documents(competition_id,title) VALUES($1,'Dokumen Edisi Lama') RETURNING id`,
      [previous.rows[0].id],
    );
    const category = await db.query<{ id: string }>(
      `INSERT INTO winner_categories(competition_id,name) VALUES($1,'Juara Umum') RETURNING id`,
      [previous.rows[0].id],
    );
    await db.query(
      `INSERT INTO winners(competition_id,category_id,full_name) VALUES($1,$2,'Pemenang Lama')`,
      [previous.rows[0].id, category.rows[0].id],
    );
    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/sites')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Event Penerus Arsip' })
      .expect(201);
    const eventBody = created.body as {
      data: { id: string; slug: string };
    };
    inheritedEventId = eventBody.data.id;
    const inheritance = await db.query(
      `SELECT 1 FROM event_site_archive_sources WHERE event_site_id=$1 AND source_event_site_id=$2`,
      [inheritedEventId, sourceEventId],
    );
    expect(inheritance.rowCount).toBe(1);
    const publication = await db.query<{ publicationStatus: string }>(
      `SELECT publication_status AS "publicationStatus" FROM competitions WHERE id=$1`,
      [previous.rows[0].id],
    );
    expect(publication.rows[0].publicationStatus).toBe('published');
    const relation = await db.query(
      `SELECT 1 FROM competition_documents WHERE id=$1 AND competition_id=$2`,
      [document.rows[0].id, previous.rows[0].id],
    );
    expect(relation.rowCount).toBe(1);
    const adminList = await request(app.getHttpServer())
      .get(`/api/v1/admin/sites/${inheritedEventId}/competitions`)
      .set('Authorization', `Bearer ${editorToken}`)
      .expect(200);
    const adminBody = adminList.body as {
      data: { id: string; lifecycle: string; inherited: boolean }[];
    };
    expect(adminBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: previous.rows[0].id,
          lifecycle: 'archived',
          inherited: true,
        }),
      ]),
    );
    const inheritedSlug = `penerus-${suffix}`;
    await request(app.getHttpServer())
      .put(`/api/v1/admin/sites/${inheritedEventId}/settings`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        eventName: 'Event Penerus Arsip',
        eventSlug: inheritedSlug,
        organizerName: 'Admin Test',
        primaryColor: '#1e4b8c',
        navigation: {},
        contact: {},
        footer: {},
      })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/sites/${inheritedEventId}/publish`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);
    const archives = await request(app.getHttpServer())
      .get(`/api/v1/public/sites/${inheritedSlug}/archives`)
      .expect(200);
    const archivesBody = archives.body as {
      data: { competitions: { slug: string }[] };
    };
    expect(archivesBody.data.competitions).toHaveLength(1);
    const detail = await request(app.getHttpServer())
      .get(
        `/api/v1/public/sites/${inheritedSlug}/archives/${archivesBody.data.competitions[0].slug}`,
      )
      .expect(200);
    const detailBody = detail.body as {
      data: {
        documents: { title: string }[];
        categories: { winners: unknown[] }[];
      };
    };
    expect(detailBody.data.documents[0].title).toBe('Dokumen Edisi Lama');
    expect(detailBody.data.categories[0].winners).toHaveLength(1);
  });

  it('soft deletes an event and removes it from the session', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/sites/${inheritedEventId}`)
      .set('Authorization', `Bearer ${editorToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/sites/${inheritedEventId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const session = await request(app.getHttpServer())
      .get('/api/v1/admin/session')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const body = session.body as { data: { sites: { id: string }[] } };
    expect(body.data.sites.some((site) => site.id === inheritedEventId)).toBe(
      false,
    );
  });

  it('prevents viewer writes and creates an audited draft for editor', async () => {
    const payload = {
      name: 'Secure Competition',
      slug: `secure-${suffix}`,
      lifecycle: 'archived',
    };
    await request(app.getHttpServer())
      .post(`/api/v1/admin/sites/${siteId}/competitions`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send(payload)
      .expect(403);
    const created = await request(app.getHttpServer())
      .post(`/api/v1/admin/sites/${siteId}/competitions`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send(payload)
      .expect(201);
    const body = created.body as {
      data: { id: string; publicationStatus: string };
    };
    expect(body.data.publicationStatus).toBe('draft');
    const audit = await db.query(
      `SELECT 1 FROM audit_logs WHERE entity_id=$1 AND action='create'`,
      [body.data.id],
    );
    expect(audit.rowCount).toBe(1);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/competitions/${body.data.id}`)
      .set('Authorization', `Bearer ${editorToken}`)
      .set('If-Match', '999')
      .send({ name: 'Stale' })
      .expect(409);
    const published = await request(app.getHttpServer())
      .post(`/api/v1/admin/competitions/${body.data.id}/publish`)
      .set('Authorization', `Bearer ${editorToken}`)
      .set('If-Match', '1')
      .expect(201);
    expect(
      (
        published.body as {
          data: { version: number; publicationStatus: string };
        }
      ).data,
    ).toEqual(
      expect.objectContaining({ version: 2, publicationStatus: 'published' }),
    );
  });

  it('completes document, winner, page, publish, and public read flow', async () => {
    const competition = await request(app.getHttpServer())
      .post(`/api/v1/admin/sites/${siteId}/competitions`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        name: 'Full Flow Event',
        slug: `flow-${suffix}`,
        lifecycle: 'current',
      })
      .expect(201);
    const competitionId = (competition.body as { data: { id: string } }).data
      .id;

    const asset = await db.query<{ id: string }>(
      `INSERT INTO media_assets(organization_id,storage_key,original_name,mime_type,byte_size,status) VALUES($1,$2,'dummy.pdf','application/pdf',128,'ready') RETURNING id`,
      [organizationId, `tests/${suffix}/dummy.pdf`],
    );
    const document = await request(app.getHttpServer())
      .post(`/api/v1/admin/competitions/${competitionId}/documents`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Panduan Dummy',
        category: 'Panduan',
        documentRole: 'juknis',
        assetId: asset.rows[0].id,
      })
      .expect(201);
    const documentId = (document.body as { data: { id: string } }).data.id;

    const category = await request(app.getHttpServer())
      .post(`/api/v1/admin/competitions/${competitionId}/winner-categories`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ name: 'Sains', rankPrefix: 'Juara' })
      .expect(201);
    const categoryId = (category.body as { data: { id: string } }).data.id;

    const winner = await request(app.getHttpServer())
      .post(`/api/v1/admin/competitions/${competitionId}/winners`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        categoryId,
        fullName: 'Pemenang Dummy',
        rankLabel: '1',
        school: 'Sekolah Uji',
      })
      .expect(201);
    const winnerId = (winner.body as { data: { id: string } }).data.id;

    await request(app.getHttpServer())
      .put(`/api/v1/admin/sites/${siteId}/pages/winners`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ title: 'Pemenang Event', alignment: 'center' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/competitions/${competitionId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`)
      .set('If-Match', '1')
      .expect(201);

    const publicWinners = await request(app.getHttpServer())
      .get(`/api/v1/public/sites/admin-${suffix}/winners`)
      .expect(200);
    const publicBody = publicWinners.body as {
      data: { categories: Array<{ winners: unknown[] }> };
    };
    expect(publicBody.data.categories[0].winners).toHaveLength(1);

    await request(app.getHttpServer())
      .patch(
        `/api/v1/admin/competitions/${competitionId}/documents/${documentId}`,
      )
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        title: 'Panduan Diperbarui',
        assetId: asset.rows[0].id,
        isActive: true,
      })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/competitions/${competitionId}/winners/${winnerId}`)
      .set('Authorization', `Bearer ${editorToken}`)
      .expect(200);
    const audit = await db.query(
      `SELECT count(*)::int count FROM audit_logs WHERE event_site_id=$1`,
      [siteId],
    );
    expect((audit.rows[0] as { count: number }).count).toBeGreaterThanOrEqual(
      8,
    );
  });

  it('uploads and serves validated local media', async () => {
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/sites/${siteId}/media`)
      .attach('file', png, { filename: 'logo.png', contentType: 'image/png' })
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/sites/${siteId}/media`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .attach('file', png, { filename: 'logo.png', contentType: 'image/png' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/sites/${siteId}/media`)
      .set('Authorization', `Bearer ${editorToken}`)
      .attach('file', Buffer.from('not an image'), {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(400);
    const uploaded = await request(app.getHttpServer())
      .post(`/api/v1/admin/sites/${siteId}/media`)
      .set('Authorization', `Bearer ${editorToken}`)
      .field('altText', 'Logo demo')
      .attach('file', png, { filename: 'logo.png', contentType: 'image/png' })
      .expect(201);
    const assetId = (uploaded.body as { data: { assetId: string } }).data
      .assetId;
    const served = await request(app.getHttpServer())
      .get(`/api/v1/public/media/${assetId}`)
      .expect(200)
      .expect('Content-Type', /image\/png/)
      .expect('X-Content-Type-Options', 'nosniff');
    expect(served.body).toEqual(png);
  });

  afterAll(async () => {
    try {
      if (siteId) {
        await db.query(`DELETE FROM competitions WHERE event_site_id=$1`, [
          siteId,
        ]);
      }
      if (organizationId) {
        await db.query(`DELETE FROM media_assets WHERE organization_id=$1`, [
          organizationId,
        ]);
        await db.query(`DELETE FROM organizations WHERE id=$1`, [
          organizationId,
        ]);
      }
      if (otherOrganizationId) {
        await db.query(`DELETE FROM organizations WHERE id=$1`, [
          otherOrganizationId,
        ]);
      }
    } finally {
      await app?.close();
      await db?.end();
    }
  });
});
