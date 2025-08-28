import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';
import * as fs from 'fs';

describe('End-to-End Chat Workflow', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Endpoints', () => {
    it('/health (GET) should return healthy status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'healthy');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
          expect(res.body).toHaveProperty('checks');
        });
    });

    it('/metrics (GET) should return application metrics', () => {
      return request(app.getHttpServer())
        .get('/metrics')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('memory');
          expect(res.body).toHaveProperty('websockets');
          expect(res.body).toHaveProperty('database');
          expect(res.body).toHaveProperty('process');
        });
    });

    it('/metrics/prometheus (GET) should return Prometheus format', () => {
      return request(app.getHttpServer())
        .get('/metrics/prometheus')
        .expect(200)
        .expect('Content-Type', /text/)
        .expect((res) => {
          expect(res.text).toContain('smartchatbot_memory_heap_used_bytes');
          expect(res.text).toContain('smartchatbot_websocket_connections');
          expect(res.text).toContain('smartchatbot_database_healthy');
        });
    });

    it('/readiness (GET) should return readiness status', () => {
      return request(app.getHttpServer())
        .get('/readiness')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ready');
          expect(res.body).toHaveProperty('checks');
          expect(Array.isArray(res.body.checks)).toBe(true);
        });
    });
  });

  describe('Application Startup', () => {
    it('should start without errors', () => {
      expect(app).toBeDefined();
    });

    it('should have proper CORS configuration', () => {
      return request(app.getHttpServer())
        .options('/health')
        .set('Origin', 'http://localhost:5173')
        .expect(204);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 routes gracefully', () => {
      return request(app.getHttpServer()).get('/nonexistent-route').expect(404);
    });

    it('should handle invalid JSON payloads', () => {
      return request(app.getHttpServer())
        .post('/health')
        .send('invalid json')
        .expect(400);
    });
  });

  describe('Manual Restart', () => {
    it('/health/restart (POST) should initiate restart', () => {
      // Mock file system operations to prevent actual restart during tests
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      const originalWriteFileSync = fs.writeFileSync;
      const originalExit = process.exit;

      fs.writeFileSync = jest.fn();
      process.exit = jest.fn() as any;

      return request(app.getHttpServer())
        .post('/health/restart')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Server restart initiated',
          );
          expect(res.body).toHaveProperty('timestamp');
        })
        .then(() => {
          // Restore original functions
          fs.writeFileSync = originalWriteFileSync;
          process.exit = originalExit;
        });
    });
  });
});
