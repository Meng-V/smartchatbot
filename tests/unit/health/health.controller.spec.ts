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

      const result = await controller.checkHealth();

      expect(result).toEqual({
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
        new Error('DB connection failed'),
      );

      await expect(controller.checkHealth()).rejects.toThrow(HttpException);

      try {
        await controller.checkHealth();
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);

        const response = error.getResponse() as any;
        expect(response.status).toBe('unhealthy');
        expect(response.checks.database).toBe('unhealthy');
      }
    });

    it('should check memory usage and report status', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue(true);

      const result = await controller.checkHealth();

      expect(result.checks.memory).toMatch(/\d+MB/);
    });

    it('should validate required environment variables', async () => {
      mockDatabaseService.healthCheck.mockResolvedValue(true);

      // Mock missing environment variable
      const originalEnv = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      await expect(controller.checkHealth()).rejects.toThrow(HttpException);

      // Restore environment variable
      process.env.DATABASE_URL = originalEnv;
    });
  });

  describe('restart', () => {
    it('should trigger restart and return success message', async () => {
      const writeFileSpy = jest
        .spyOn(require('fs'), 'writeFileSync')
        .mockImplementation();
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

      const result = await controller.restart();

      expect(result).toEqual({
        message: 'Server restart initiated',
        timestamp: expect.any(String),
      });

      expect(writeFileSpy).toHaveBeenCalledWith(
        '.restart-flag',
        expect.any(String),
      );
      expect(exitSpy).toHaveBeenCalledWith(0);

      writeFileSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });
});
