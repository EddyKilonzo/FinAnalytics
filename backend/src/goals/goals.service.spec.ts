import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { GoalsService } from "./goals.service";

jest.mock("../common/helpers/prisma-error.handler", () => ({
  handlePrismaError: jest.fn((err: Error) => {
    throw err;
  }),
}));

describe("GoalsService", () => {
  const baseGoal = {
    id: "goal-1",
    userId: "user-1",
    name: "Rainy day",
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

  const mockTransactionsService = {
    getSummary: jest.fn().mockResolvedValue({ balance: 10000 }),
    create: jest.fn().mockResolvedValue({ id: "tx-1", amount: 5000, type: "expense" }),
  };

  let service: GoalsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionsService.getSummary.mockResolvedValue({ balance: 10000 });
    mockTransactionsService.create.mockResolvedValue({ id: "tx-1", amount: 5000, type: "expense" });
    service = new GoalsService(mockPrisma as any, mockTransactionsService as any);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create goal and return with progress fields", async () => {
      mockPrisma.goal.create.mockResolvedValue(baseGoal);
      const result = await service.create(
        { name: "Rainy day", targetAmount: 50000 },
        "user-1",
      );
      expect(result).toHaveProperty("name", "Rainy day");
      expect(result).toHaveProperty("targetAmount", 50000);
      expect(result).toHaveProperty("percentage");
      expect(result).toHaveProperty("status");
      expect(mockPrisma.goal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          name: "Rainy day",
          targetAmount: 50000,
          currentAmount: 0,
        }),
      });
    });
  });

  describe("findAll", () => {
    it("should scope by userId when not admin", async () => {
      mockPrisma.goal.findMany.mockResolvedValue([]);
      await service.findAll("user-1", "USER");
      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
        }),
      );
    });

    it("should not scope when admin", async () => {
      mockPrisma.goal.findMany.mockResolvedValue([]);
      await service.findAll("admin-1", "ADMIN");
      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  describe("findById", () => {
    it("should throw NotFoundException when goal does not exist", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(null);
      await expect(
        service.findById("missing", "user-1", "USER"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user does not own goal", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        ...baseGoal,
        userId: "other-user",
      });
      await expect(
        service.findById("goal-1", "user-1", "USER"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("allocate", () => {
    it("should check balance, create expense transaction, add to goal and return enriched goal", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(baseGoal);
      mockPrisma.goal.update.mockResolvedValue({
        ...baseGoal,
        currentAmount: 5000,
      });
      const result = await service.allocate(
        "goal-1",
        { amount: 5000 },
        "user-1",
        "USER",
      );
      expect(mockTransactionsService.getSummary).toHaveBeenCalledWith("user-1");
      expect(mockTransactionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          type: "expense",
          description: "Transfer to goal: Rainy day",
        }),
        "user-1",
      );
      expect(mockPrisma.goal.update).toHaveBeenCalledWith({
        where: { id: "goal-1" },
        data: { currentAmount: 5000 },
      });
      expect(result).toHaveProperty("currentAmount", 5000);
    });

    it("should throw BadRequestException when amount exceeds balance", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(baseGoal);
      mockTransactionsService.getSummary.mockResolvedValue({ balance: 1000 });
      await expect(
        service.allocate("goal-1", { amount: 5000 }, "user-1", "USER"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.allocate("goal-1", { amount: 5000 }, "user-1", "USER"),
      ).rejects.toThrow("Total Balance is only");
      expect(mockTransactionsService.create).not.toHaveBeenCalled();
      expect(mockPrisma.goal.update).not.toHaveBeenCalled();
    });
  });

  describe("withdraw", () => {
    it("should throw BadRequestException when amount exceeds currentAmount", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        ...baseGoal,
        currentAmount: 1000,
      });
      await expect(
        service.withdraw("goal-1", { amount: 2000 }, "user-1", "USER"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.withdraw("goal-1", { amount: 2000 }, "user-1", "USER"),
      ).rejects.toThrow("only has KES 1000");
      expect(mockPrisma.goal.update).not.toHaveBeenCalled();
    });
  });
});
