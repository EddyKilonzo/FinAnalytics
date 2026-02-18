import { NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

jest.mock('../common/helpers/prisma-error.handler', () => ({
  handlePrismaError: jest.fn((err: Error) => {
    throw err;
  }),
}));

describe('TransactionsService', () => {
  const mockTransaction = {
    id: 'tx-1',
    amount: 100,
    type: 'expense',
    description: 'Lunch',
    date: new Date(),
    categoryId: 'cat-1',
    userId: 'user-1',
    category: { id: 'cat-1', slug: 'food', name: 'Food' },
    suggestedCategory: null,
    suggestedCategoryId: null,
    categoryConfidence: null,
    incomeSource: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    transaction: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
  };

  const mockMl = {
    categorise: jest.fn().mockResolvedValue(null),
    sendFeedback: jest.fn().mockResolvedValue(undefined),
  };

  let service: TransactionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.transaction.count.mockResolvedValue(0);
    service = new TransactionsService(mockPrisma as any, mockMl as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated list with total and totalPages', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([mockTransaction]);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const result = await service.findAll(
        { page: 1, limit: 20 },
        'user-1',
        'USER',
      );

      expect(result).toMatchObject({
        transactions: [mockTransaction],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should scope by userId when user is not admin', async () => {
      await service.findAll({}, 'user-42', 'USER');
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-42' },
        }),
      );
    });

    it('should not scope by userId when user is admin', async () => {
      await service.findAll({}, 'admin-1', 'ADMIN');
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when transaction does not exist', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);
      await expect(
        service.findById('missing', 'user-1', 'USER'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findById('missing', 'user-1', 'USER'),
      ).rejects.toThrow('was not found');
    });

    it('should return transaction when found and user owns it', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(mockTransaction);
      const result = await service.findById('tx-1', 'user-1', 'USER');
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('create', () => {
    it('should create and return transaction without ML when no description', async () => {
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction);
      const result = await service.create(
        { amount: 100, type: 'expense' },
        'user-1',
      );
      expect(result).toEqual(mockTransaction);
      expect(mockPrisma.transaction.create).toHaveBeenCalled();
      expect(mockMl.categorise).not.toHaveBeenCalled();
    });

    it('should create transaction with categoryId when provided', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1', slug: 'food' });
      mockPrisma.transaction.create.mockResolvedValue(mockTransaction);
      await service.create(
        { amount: 50, type: 'expense', categoryId: 'cat-1' },
        'user-1',
      );
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            categoryId: 'cat-1',
            userId: 'user-1',
          }),
        }),
      );
    });
  });
});
