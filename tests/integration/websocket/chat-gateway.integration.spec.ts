import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Socket, io } from 'socket.io-client';
import { AppModule } from '../../../src/app.module';

describe('ChatGateway Integration', () => {
  let app: INestApplication;
  let clientSocket: Socket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.listen(3001);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach((done) => {
    clientSocket = io('http://localhost:3001', {
      path: '/smartchatbot/socket.io',
      transports: ['websocket'],
    });

    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('message handling', () => {
    it('should handle user message and return AI response', (done) => {
      const testMessage = 'Hello, I need help with library hours';

      clientSocket.on('message', (response) => {
        expect(response).toHaveProperty('messageId');
        expect(response).toHaveProperty('message');
        expect(typeof response.message).toBe('string');
        expect(response.message.length).toBeGreaterThan(0);
        done();
      });

      clientSocket.emit('message', testMessage);
    }, 30000);

    it('should handle invalid message input', (done) => {
      clientSocket.on('message', (response) => {
        expect(response).toHaveProperty('isError', true);
        expect(response).toHaveProperty('showLibrarianOption', true);
        expect(response.message).toContain('valid message');
        done();
      });

      clientSocket.emit('message', '');
    });

    it('should handle message rating', (done) => {
      const testMessage = 'Test message for rating';

      clientSocket.on('message', (response) => {
        // Rate the message
        clientSocket.emit('messageRating', {
          messageId: response.messageId,
          isPositiveRated: true,
        });

        // No response expected for rating, just complete the test
        setTimeout(() => {
          done();
        }, 1000);
      });

      clientSocket.emit('message', testMessage);
    }, 15000);
  });

  describe('user feedback', () => {
    it('should handle user feedback submission', (done) => {
      const userFeedback = {
        userRating: 4,
        userComment: 'Great service!',
      };

      // First send a message to establish conversation
      clientSocket.on('message', () => {
        // Then submit feedback
        clientSocket.emit('userFeedback', userFeedback);

        // No response expected for feedback, just complete the test
        setTimeout(() => {
          done();
        }, 1000);
      });

      clientSocket.emit('message', 'Test message for feedback');
    }, 15000);
  });

  describe('connection lifecycle', () => {
    it('should handle multiple connections', (done) => {
      const client2 = io('http://localhost:3001', {
        path: '/smartchatbot/socket.io',
        transports: ['websocket'],
      });

      let responsesReceived = 0;
      const expectedResponses = 2;

      const handleResponse = () => {
        responsesReceived++;
        if (responsesReceived === expectedResponses) {
          client2.disconnect();
          done();
        }
      };

      clientSocket.on('message', handleResponse);
      client2.on('message', handleResponse);

      client2.on('connect', () => {
        clientSocket.emit('message', 'Message from client 1');
        client2.emit('message', 'Message from client 2');
      });
    }, 30000);

    it('should clean up resources on disconnect', (done) => {
      const testMessage = 'Test cleanup message';

      clientSocket.on('message', () => {
        // Disconnect after receiving response
        clientSocket.disconnect();

        // Verify cleanup happened (no direct way to test, but ensure no errors)
        setTimeout(() => {
          done();
        }, 1000);
      });

      clientSocket.emit('message', testMessage);
    }, 15000);
  });

  describe('rate limiting', () => {
    it('should handle rapid message sending', (done) => {
      let messageCount = 0;
      let errorReceived = false;

      clientSocket.on('message', (response) => {
        messageCount++;

        if (response.isError && response.code === 'RATE_LIMIT_EXCEEDED') {
          errorReceived = true;
        }

        // Stop after receiving rate limit error or 35 messages
        if (errorReceived || messageCount >= 35) {
          expect(errorReceived).toBe(true);
          done();
        }
      });

      clientSocket.on('error', (error) => {
        if (error.code === 'RATE_LIMIT_EXCEEDED') {
          errorReceived = true;
          done();
        }
      });

      // Send messages rapidly to trigger rate limit
      for (let i = 0; i < 35; i++) {
        setTimeout(() => {
          clientSocket.emit('message', `Rapid message ${i}`);
        }, i * 100); // 100ms intervals
      }
    }, 15000);
  });
});
