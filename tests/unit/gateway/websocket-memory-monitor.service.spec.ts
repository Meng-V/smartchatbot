import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketMemoryMonitorService } from '../../../src/gateway/websocket-memory-monitor.service';

describe('WebSocketMemoryMonitorService', () => {
  let service: WebSocketMemoryMonitorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebSocketMemoryMonitorService],
    }).compile();

    service = module.get<WebSocketMemoryMonitorService>(
      WebSocketMemoryMonitorService,
    );
  });

  describe('connection tracking', () => {
    it('should increment connection count', () => {
      const initialCount = service.getConnectionCount();

      service.incrementConnection();

      expect(service.getConnectionCount()).toBe(initialCount + 1);
    });

    it('should decrement connection count', () => {
      service.incrementConnection();
      service.incrementConnection();
      const countAfterIncrements = service.getConnectionCount();

      service.decrementConnection();

      expect(service.getConnectionCount()).toBe(countAfterIncrements - 1);
    });

    it('should not go below zero when decrementing', () => {
      service.decrementConnection();
      service.decrementConnection();

      expect(service.getConnectionCount()).toBe(0);
    });

    it('should warn when connection count exceeds maximum', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      // Simulate exceeding max connections
      for (let i = 0; i <= 1000; i++) {
        service.incrementConnection();
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('High connection count: 1001/1000'),
      );
    });
  });

  describe('memory monitoring', () => {
    it('should return current memory stats', () => {
      service.incrementConnection();
      service.incrementConnection();

      const stats = service.getMemoryStats();

      expect(stats).toHaveProperty('heapUsedMB');
      expect(stats).toHaveProperty('connectionCount');
      expect(stats.connectionCount).toBe(2);
      expect(typeof stats.heapUsedMB).toBe('number');
    });

    it('should check memory usage periodically', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 600 * 1024 * 1024, // 600MB
        heapTotal: 800 * 1024 * 1024,
        rss: 700 * 1024 * 1024,
        external: 50 * 1024 * 1024,
      });

      service['checkMemoryUsage']();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('High memory usage: 600MB/512MB'),
      );

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should force garbage collection when available', () => {
      const mockGc = jest.fn();
      (global as any).gc = mockGc;

      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 600 * 1024 * 1024, // 600MB
        heapTotal: 800 * 1024 * 1024,
        rss: 700 * 1024 * 1024,
        external: 50 * 1024 * 1024,
      });

      service['checkMemoryUsage']();

      expect(mockGc).toHaveBeenCalled();

      // Cleanup
      delete (global as any).gc;
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('lifecycle', () => {
    it('should log shutdown message on module destroy', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      service.onModuleDestroy();

      expect(loggerSpy).toHaveBeenCalledWith(
        'WebSocket memory monitor shutting down',
      );
    });
  });
});
