import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  const mockPrisma = {
    transaction: {
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    category: { findMany: jest.fn().mockResolvedValue([]) },
  };

  let service: AnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsService(mockPrisma as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getInsights', () => {
    it('should return an array', async () => {
      const result = await service.getInsights('user-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when no insights match', async () => {
      const result = await service.getInsights('user-1');
      expect(result).toEqual([]);
    });
  });
});
