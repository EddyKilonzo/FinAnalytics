import { NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { LessonsService } from './lessons.service';

jest.mock('../common/prisma.service', () => ({ PrismaService: jest.fn() }));
jest.mock('../common/helpers/prisma-error.handler', () => ({
  handlePrismaError: jest.fn((err: Error) => {
    throw err;
  }),
}));
jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return { ...actual, readFileSync: jest.fn() };
});

const mockLessons = [
  {
    id: 'lesson-1',
    title: 'Test Lesson',
    slug: 'test-lesson',
    durationMinutes: 5,
    topics: ['budgeting'],
    summary: 'A test lesson.',
    body: '## Content',
  },
];

describe('LessonsService', () => {
  const mockPrisma = {
    transaction: { count: jest.fn().mockResolvedValue(0) },
    goal: { count: jest.fn().mockResolvedValue(0) },
  };

  let service: LessonsService;

  beforeEach(() => {
    (readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockLessons));
    jest.clearAllMocks();
    service = new LessonsService(mockPrisma as any);
    (service as any).lessons = null;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return lesson metadata without body', () => {
      const result = service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'lesson-1',
        title: 'Test Lesson',
        slug: 'test-lesson',
        durationMinutes: 5,
        topics: ['budgeting'],
        summary: 'A test lesson.',
      });
      expect((result[0] as any).body).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('should return lesson by id', () => {
      const result = service.findOne('lesson-1');
      expect(result).toMatchObject({ id: 'lesson-1', slug: 'test-lesson', body: '## Content' });
    });

    it('should return lesson by slug', () => {
      const result = service.findOne('test-lesson');
      expect(result.slug).toBe('test-lesson');
    });

    it('should throw NotFoundException when not found', () => {
      expect(() => service.findOne('nonexistent')).toThrow(NotFoundException);
      expect(() => service.findOne('nonexistent')).toThrow('was not found');
    });
  });
});
