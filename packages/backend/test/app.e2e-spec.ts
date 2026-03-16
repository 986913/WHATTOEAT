import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

/**
 * Basic smoke test - verifies the NestJS test framework is properly configured.
 * Full integration tests for auth and plans are in their respective e2e spec files.
 */
describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const { Controller, Get, Module } = await import('@nestjs/common');

    @Controller()
    class HealthController {
      @Get()
      getHealth() {
        return { status: 'ok' };
      }
    }

    @Module({ controllers: [HealthController] })
    class TestAppModule {}

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET) should return health status', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({ status: 'ok' });
  });
});
