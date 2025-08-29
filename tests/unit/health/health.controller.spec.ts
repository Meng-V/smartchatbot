import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HealthController } from '../../../src/health/health.controller';
import { DatabaseService } from '../../../src/database/database.service';

describe('HealthController', () => {
  let controller: HealthController;
  let databaseService: jest.Mocked<DatabaseService>;

  const mockDatabaseService = {
    healthCheck: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    databaseService = module.get(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('should return healthy status when all checks pass', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue(true);
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await controller.checkHealth(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        checks: {
          database: 'healthy',
          memory: expect.any(String),
          environment: 'healthy',
        },
      });
    });

    it('should return unhealthy status when database check fails', async () => {
      mockDatabaseService.healthCheck.mockRejectedValue(
        new Error('Database connection failed'),
      );
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await expect(controller.checkHealth(mockRes)).rejects.toThrow(HttpException);

      try {
        await controller.checkHealth(mockRes);
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);

        const response = error.getResponse() as any;
        expect(response.status).toBe('unhealthy');
        expect(response.checks.database).toBe('unhealthy');
      }
    });

    it('should include memory usage in health check', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue(true);
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await controller.checkHealth(mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          checks: expect.objectContaining({
            memory: expect.stringMatching(/\d+MB/),
          }),
        }),
      );
    });

    it('should validate required environment variables', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue(true);

      // Mock missing environment variable
      const originalEnv = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      await expect(controller.checkHealth(mockRes)).rejects.toThrow(HttpException);

      // Restore environment variable
      process.env.DATABASE_URL = originalEnv;
    });
  });

  // Restart functionality is handled by separate endpoint, removing this test
  // as the restart method doesn't exist on HealthController
});
