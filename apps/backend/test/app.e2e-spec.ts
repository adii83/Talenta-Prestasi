import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('API security (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

  it('serves the versioned API root', () =>
    request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!'));

  it('exposes the public base domain for frontend runtime configuration', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/public/runtime-config')
      .expect(200);

    expect(response.body).toEqual({
      data: {
        publicBaseDomain: String(
          process.env.PUBLIC_BASE_DOMAIN || 'nexaplaymetadata.online',
        )
          .trim()
          .toLowerCase()
          .replace(/^\.+|\.+$/g, ''),
      },
      errors: [],
    });
  });

  it('rejects malformed login credentials', () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'A!', password: 'short' })
      .expect(400));

  it('rejects the legacy email login field', () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'valid-password' })
      .expect(400));

  it('rejects unknown login fields', () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: 'admin',
        password: 'valid-password',
        unexpected: true,
      })
      .expect(400));

  afterAll(async () => {
    await app.close();
  });
});
