import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { GoalsService } from './goals.service';

jest.mock('../common/helpers/prisma-error.handler', () => ({
  handlePrismaError: jest.fn((err: Error) => {
    throw err;
  }),
}));

describe('GoalsService', () => {
  const baseGoal = {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Rainy day',
    description: null,
    targetAmount: 50000,
    currentAmount: 0,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    goal: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  let service: GoalsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GoalsService(mockPrisma as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create goal and return with progress fields', async () => {
      mockPrisma.goal.create.mockResolvedValue(baseGoal);
      const result = await service.create(
        { name: 'Rainy day', targetAmount: 50000 },
        'user-1',
      );
      expect(result).toHaveProperty('name', 'Rainy day');
      expect(result).toHaveProperty('targetAmount', 50000);
      expect(result).toHaveProperty('percentage');
      expect(result).toHaveProperty('status');
      expect(mockPrisma.goal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          name: 'Rainy day',
          targetAmount: 50000,
          currentAmount: 0,
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should scope by userId when not admin', async () => {
      mockPrisma.goal.findMany.mockResolvedValue([]);
      await service.findAll('user-1', 'USER');
      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
    });

    it('should not scope when admin', async () => {
      mockPrisma.goal.findMany.mockResolvedValue([]);
      await service.findAll('admin-1', 'ADMIN');
      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when goal does not exist', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(null);
      await expect(
        service.findById('missing', 'user-1', 'USER'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own goal', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        ...baseGoal,
        userId: 'other-user',
      });
      await expect(
        service.findById('goal-1', 'user-1', 'USER'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('allocate', () => {
    it('should add amount to currentAmount and return enriched goal', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(baseGoal);
      mockPrisma.goal.update.mockResolvedValue({
        ...baseGoal,
        currentAmount: 5000,
      });
      const result = await service.allocate(
        'goal-1',
        { amount: 5000 },
        'user-1',
        'USER',
      );
      expect(mockPrisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: { currentAmount: 5000 },
      });
      expect(result).toHaveProperty('currentAmount', 5000);
    });
  });

  describe('withdraw', () => {
    it('should throw BadRequestException when amount exceeds currentAmount', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        ...baseGoal,
        currentAmount: 1000,
      });
      await expect(
        service.withdraw('goal-1', { amount: 2000 }, 'user-1', 'USER'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.withdraw('goal-1', { amount: 2000 }, 'user-1', 'USER'),
      ).rejects.toThrow('only has KES 1000');
      expect(mockPrisma.goal.update).not.toHaveBeenCalled();
    });
  });
});
