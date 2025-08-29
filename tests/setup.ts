import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Mock console methods to reduce noise in tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

// Global test utilities
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).testUtils = {
  createMockSocket: () => ({
    id: 'test-socket-id',
    emit: jest.fn(),
    disconnect: jest.fn(),
    handshake: {
      headers: {},
      address: '127.0.0.1',
    },
  }),

  createMockMessage: (overrides = {}) => ({
    id: 'test-message-id',
    content: 'Test message content',
    role: 'Customer',
    timestamp: new Date(),
    ...overrides,
  }),

  createMockConversation: (overrides = {}) => ({
    id: 'test-conversation-id',
    createdAt: new Date(),
    ...overrides,
  }),
};

// Extend Jest matchers
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
});
