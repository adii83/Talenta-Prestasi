import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from 'bcrypt';
import { Client } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Admin Category → Event flow (e2e)', () => {
  let app: INestApplication<App>;
  let db: Client;
  let organizationId: string;
  let otherOrganizationId: string;
  let categoryId: string;
  let archivedEventId: string;
  let activeEventId: string;
  let archivedEventSlug: string;
  let ownerToken: string;
  let editorToken: string;
  let viewerToken: string;
  let outsiderToken: string;
  const suffix = Date.now().toString();
  const categorySlug = `category-${suffix}`;

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

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

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
      `INSERT INTO organizations(name,slug) VALUES('Admin Test',$1) RETURNING id`,
      [`admin-${suffix}`],
    );
    organizationId = organization.rows[0].id;
    const other = await db.query<{ id: string }>(
      `INSERT INTO organizations(name,slug) VALUES('Other Test',$1) RETURNING id`,
      [`other-${suffix}`],
    );
    otherOrganizationId = other.rows[0].id;

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

  it('validates and isolates category creation', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set(auth(ownerToken))
      .send({ name: 'Invalid', slug: 'Invalid Slug' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set(auth(editorToken))
      .send({ name: 'Category Test', slug: categorySlug })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set(auth(ownerToken))
      .send({ name: 'Category Test', slug: categorySlug })
      .expect(201);
    categoryId = (created.body as { data: { id: string } }).data.id;

    await request(app.getHttpServer())
      .get(`/api/v1/admin/categories/${categoryId}/events`)
      .set(auth(outsiderToken))
      .expect(403);
    const session = await request(app.getHttpServer())
      .get('/api/v1/admin/session')
      .set(auth(ownerToken))
      .expect(200);
    expect(session.body.data.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: categoryId, slug: categorySlug }),
      ]),
    );
  });

  it('creates events inside a category and enforces tenant roles', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/admin/categories/${categoryId}/events`)
      .set(auth(editorToken))
      .send({ periodYear: 2025, batchEnabled: false })
      .expect(403);

    const archived = await request(app.getHttpServer())
      .post(`/api/v1/admin/categories/${categoryId}/events`)
      .set(auth(ownerToken))
      .send({ periodYear: 2025, batchEnabled: false })
      .expect(201);
    archivedEventId = archived.body.data.id;
    archivedEventSlug = archived.body.data.slug;

    const active = await request(app.getHttpServer())
      .post(`/api/v1/admin/categories/${categoryId}/events`)
      .set(auth(ownerToken))
      .send({ periodYear: 2026, batchEnabled: false })
      .expect(201);
    activeEventId = active.body.data.id;

    await request(app.getHttpServer())
      .get(`/api/v1/admin/events/${activeEventId}`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/v1/admin/events/${activeEventId}`)
      .set(auth(outsiderToken))
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/v1/admin/events/${activeEventId}`)
      .set(auth(viewerToken))
      .expect(200);

    const settings = await db.query(
      `SELECT event_site_id FROM site_settings WHERE event_site_id=ANY($1::uuid[])`,
      [[archivedEventId, activeEventId]],
    );
    expect(settings.rowCount).toBe(2);
  });

  it('blocks viewer aggregate writes and accepts editor content writes', async () => {
    const home = {
      sections: [
        { sectionType: 'hero', isActive: true, settings: { title: 'Aktif' } },
      ],
    };
    await request(app.getHttpServer())
      .put(`/api/v1/admin/events/${activeEventId}/home`)
      .set(auth(viewerToken))
      .send(home)
      .expect(403);
    await request(app.getHttpServer())
      .put(`/api/v1/admin/events/${activeEventId}/downloads`)
      .set(auth(viewerToken))
      .send({ tabs: [] })
      .expect(403);
    await request(app.getHttpServer())
      .put(`/api/v1/admin/events/${activeEventId}/home`)
      .set(auth(editorToken))
      .send(home)
      .expect(200);
    await request(app.getHttpServer())
      .put(`/api/v1/admin/events/${activeEventId}/settings`)
      .set(auth(editorToken))
      .send({
        eventDescription: 'Deskripsi event aktif',
        primaryColor: '#123456',
        navigation: { home: true },
        contact: {},
        footer: {},
        seo: {},
      })
      .expect(200);
  });

  it('supports event content and automatic archives', async () => {
    const document = await request(app.getHttpServer())
      .post(`/api/v1/admin/events/${archivedEventId}/documents`)
      .set(auth(editorToken))
      .send({ title: 'Dokumen Arsip', category: 'Panduan' })
      .expect(201);
    const documentId = document.body.data.id as string;
    const winnerCategory = await request(app.getHttpServer())
      .post(`/api/v1/admin/events/${archivedEventId}/winner-categories`)
      .set(auth(editorToken))
      .send({ name: 'Juara Umum' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/events/${archivedEventId}/winners`)
      .set(auth(editorToken))
      .send({
        categoryId: winnerCategory.body.data.id,
        fullName: 'Pemenang Arsip',
      })
      .expect(201);
    await request(app.getHttpServer())
      .put(`/api/v1/admin/events/${archivedEventId}/downloads`)
      .set(auth(editorToken))
      .send({
        tabs: [
          {
            customTabName: 'Arsip',
            isDefault: true,
            isActive: true,
            documents: [{ documentId, isVisible: true, labelOverride: '' }],
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/events/${archivedEventId}/activate`)
      .set(auth(ownerToken))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/events/${activeEventId}/activate`)
      .set(auth(ownerToken))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/events/${archivedEventId}/publish`)
      .set(auth(editorToken))
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/events/${activeEventId}/publish`)
      .set(auth(editorToken))
      .send({})
      .expect(201);

    const events = await request(app.getHttpServer())
      .get(`/api/v1/admin/categories/${categoryId}/events`)
      .set(auth(editorToken))
      .expect(200);
    expect(events.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: activeEventId, isActive: true }),
        expect.objectContaining({ id: archivedEventId, isActive: false }),
      ]),
    );
  });

  it('publishes the category and resolves its active event publicly', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/admin/categories/${categoryId}/publish`)
      .set(auth(editorToken))
      .expect(403);
    const published = await request(app.getHttpServer())
      .post(`/api/v1/admin/categories/${categoryId}/publish`)
      .set(auth(ownerToken))
      .expect(201);
    expect(published.body.data).toEqual(
      expect.objectContaining({
        publicationStatus: 'published',
        hostname: `${categorySlug}.nexaplaymetadata.online`,
      }),
    );

    const bootstrap = await request(app.getHttpServer())
      .get(`/api/v1/public/sites/${categorySlug}/bootstrap`)
      .expect(200);
    expect(bootstrap.body.data.currentEvent).toEqual(
      expect.objectContaining({ name: 'Category Test 2026' }),
    );
    const archives = await request(app.getHttpServer())
      .get(`/api/v1/public/sites/${categorySlug}/archives`)
      .expect(200);
    expect(archives.body.data.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: archivedEventSlug }),
      ]),
    );
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/public/sites/${categorySlug}/archives/${archivedEventSlug}`)
      .expect(200);
    expect(detail.body.data.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Dokumen Arsip' }),
      ]),
    );
    expect(detail.body.data.categories[0].winners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fullName: 'Pemenang Arsip' }),
      ]),
    );
  });

  it('uploads media through the event route', async () => {
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/events/${activeEventId}/media`)
      .set(auth(viewerToken))
      .attach('file', png, { filename: 'logo.png', contentType: 'image/png' })
      .expect(403);
    const uploaded = await request(app.getHttpServer())
      .post(`/api/v1/admin/events/${activeEventId}/media`)
      .set(auth(editorToken))
      .field('altText', 'Logo demo')
      .attach('file', png, { filename: 'logo.png', contentType: 'image/png' })
      .expect(201);
    const assetId = uploaded.body.data.assetId as string;
    await request(app.getHttpServer())
      .get(`/api/v1/public/media/${assetId}`)
      .expect(404);
  });

  afterAll(async () => {
    try {
      if (organizationId)
        await db.query(`DELETE FROM organizations WHERE id=$1`, [
          organizationId,
        ]);
      if (otherOrganizationId)
        await db.query(`DELETE FROM organizations WHERE id=$1`, [
          otherOrganizationId,
        ]);
    } finally {
      await app?.close();
      await db?.end();
    }
  });
});
