import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../../../src/database/database.service';
import { PrismaService } from '../../../src/database/prisma-service/prisma.service';
import { Role } from '../../../src/llm-chain/memory/memory.interface';
import { LlmModelType } from '../../../src/llm-chain/llm/llm.module';

describe('DatabaseService', () => {
  let service: DatabaseService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    conversation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    conversationFeedback: {
      create: jest.fn(),
    },
    tokenUsage: {
      create: jest.fn(),
    },
    toolsUsed: {
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should return true when database is accessible', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const result = await service.healthCheck();

      expect(result).toBe(true);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('SELECT 1 as result')]),
      );
    });

    it('should throw error when database is not accessible', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error('Connection failed'),
      );

      await expect(service.healthCheck()).rejects.toThrow('Connection failed');
    });
  });

  describe('addMessageToDatabase', () => {
    it('should create a new conversation and message when no conversationId provided', async () => {
      const mockConversation = { id: 'conv-123', createdAt: new Date() };
      const mockMessage = {
        id: 'msg-456',
        content: 'Hello',
        role: Role.Customer,
      };

      mockPrismaService.conversation.create.mockResolvedValue(mockConversation);
      mockPrismaService.message.create.mockResolvedValue(mockMessage);

      const result = await service.addMessageToDatabase(Role.Customer, 'Hello');

      expect(result).toEqual(['msg-456', 'conv-123']);
      expect(mockPrismaService.conversation.create).toHaveBeenCalled();
      expect(mockPrismaService.message.create).toHaveBeenCalledWith({
        data: {
          content: 'Hello',
          role: Role.Customer,
          conversationId: 'conv-123',
        },
      });
    });

    it('should use existing conversation when conversationId provided', async () => {
      const mockMessage = {
        id: 'msg-789',
        content: 'Hi there',
        role: Role.AIAgent,
      };

      mockPrismaService.message.create.mockResolvedValue(mockMessage);

      const result = await service.addMessageToDatabase(
        Role.AIAgent,
        'Hi there',
        'existing-conv-123',
      );

      expect(result).toEqual(['msg-789', 'existing-conv-123']);
      expect(mockPrismaService.conversation.create).not.toHaveBeenCalled();
      expect(mockPrismaService.message.create).toHaveBeenCalledWith({
        data: {
          content: 'Hi there',
          role: Role.AIAgent,
          conversationId: 'existing-conv-123',
        },
      });
    });
  });

  describe('updateMessageRating', () => {
    it('should update message with positive rating', async () => {
      const mockUpdatedMessage = { id: 'msg-123', isPositiveRated: true };
      mockPrismaService.message.update.mockResolvedValue(mockUpdatedMessage);

      await service.updateMessageRating('msg-123', true);

      expect(mockPrismaService.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-123' },
        data: { isPositiveRated: true },
      });
    });

    it('should update message with negative rating', async () => {
      const mockUpdatedMessage = { id: 'msg-456', isPositiveRated: false };
      mockPrismaService.message.update.mockResolvedValue(mockUpdatedMessage);

      await service.updateMessageRating('msg-456', false);

      expect(mockPrismaService.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-456' },
        data: { isPositiveRated: false },
      });
    });
  });

  describe('addUserFeedbackToDatabase', () => {
    it('should create conversation feedback', async () => {
      const userFeedback = { userRating: 4, userComment: 'Great service!' };
      const mockFeedback = { id: 'feedback-123', ...userFeedback };

      mockPrismaService.conversationFeedback.create.mockResolvedValue(
        mockFeedback,
      );

      await service.addUserFeedbackToDatabase('conv-123', userFeedback);

      expect(
        mockPrismaService.conversationFeedback.create,
      ).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-123',
          userRating: 4,
          userComment: 'Great service!',
        },
      });
    });
  });

  describe('addTokenDataInConversation', () => {
    it('should create token usage record', async () => {
      const mockTokenUsage = {
        id: 'token-123',
        conversationId: 'conv-123',
        llmModelType: 'GPT_4',
        completionTokens: 100,
        promptTokens: 50,
        totalTokens: 150,
      };

      mockPrismaService.tokenUsage.create.mockResolvedValue(mockTokenUsage);

      await service.addTokenDataInConversation(
        'conv-123',
        'GPT_4',
        100,
        50,
        150,
      );

      expect(mockPrismaService.tokenUsage.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-123',
          llmModelType: 'GPT_4',
          completionTokens: 100,
          promptTokens: 50,
          totalTokens: 150,
        },
      });
    });
  });

  describe('addToolsUsedInConversation', () => {
    it('should create tools used records', async () => {
      const toolsUsed = ['search_tool', 'reservation_tool'];
      const mockToolsUsed = [
        { id: 'tool-1', toolName: 'search_tool' },
        { id: 'tool-2', toolName: 'reservation_tool' },
      ];

      mockPrismaService.toolsUsed.create
        .mockResolvedValueOnce(mockToolsUsed[0])
        .mockResolvedValueOnce(mockToolsUsed[1]);

      await service.addToolsUsedInConversation('conv-123', toolsUsed);

      expect(mockPrismaService.toolsUsed.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.toolsUsed.create).toHaveBeenNthCalledWith(1, {
        data: {
          conversationId: 'conv-123',
          toolName: 'search_tool',
        },
      });
      expect(mockPrismaService.toolsUsed.create).toHaveBeenNthCalledWith(2, {
        data: {
          conversationId: 'conv-123',
          toolName: 'reservation_tool',
        },
      });
    });
  });
});
