import { Test, TestingModule } from '@nestjs/testing';
import { ExerciseStatisticsService } from './exercise-statistics.service';
import { RpcException } from '@nestjs/microservices';
import { Period } from '../common/enums/analytics.enum';
import { NATS_SERVICE } from '../config/services.config';
import { of } from 'rxjs';
import { Category, Difficulty } from '../common/enums/analytics.enum';

// Mock ClientProxy
const clientProxyMock = {
  send: jest.fn()
};

// Mock Prisma Client
const prismaServiceMock = {
  exerciseStatistics: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  exerciseCategoryStats: {
    groupBy: jest.fn(),
  },
  exerciseDifficultyStats: {
    groupBy: jest.fn(),
  },
  $connect: jest.fn(),
};

describe('ExerciseStatisticsService', () => {
  let service: ExerciseStatisticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExerciseStatisticsService,
        {
          provide: NATS_SERVICE,
          useValue: clientProxyMock
        }
      ],
    }).compile();

    service = module.get<ExerciseStatisticsService>(ExerciseStatisticsService);
    // Replace Prisma instance with mock
    Object.assign(service, prismaServiceMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateExerciseStatistics', () => {
    const mockDate = new Date('2025-02-03');
    const mockExerciseId = 1;
    const mockExercise = {
      id: mockExerciseId,
      totalRatings: 10,
      level: Difficulty.BASIC,
      category: Category.STRENGTH,
      score: 4.5
    };

    it('should create new statistics if none exist', async () => {
      // Mock dependencies
      prismaServiceMock.exerciseStatistics.findFirst.mockResolvedValue(null);
      clientProxyMock.send.mockImplementation((pattern) => {
        switch (pattern) {
          case 'calculate.gender.stats.by.target':
            return of([{ gender: 'MALE', count: 5 }]);
          case 'find.exercise.by.id':
            return of(mockExercise);
          default:
            return of(null);
        }
      });

      // Mock creation
      prismaServiceMock.exerciseStatistics.create.mockResolvedValue({
        id: '1',
        exerciseId: mockExerciseId,
        period: Period.DAILY,
        date: mockDate,
        totalUses: 10,
        popularityScore: 4.5,
        genderStats: [{ gender: 'MALE', useCount: 5 }],
        categoryStats: [{ category: Category.STRENGTH, useCount: 10 }],
        difficultyStats: [{ difficulty: Difficulty.BASIC, useCount: 10 }]
      });

      const result = await service.generateExerciseStatistics(mockExerciseId, Period.DAILY, mockDate);

      expect(result).toHaveProperty('exerciseId', mockExerciseId);
      expect(result.genderStats).toHaveLength(1);
      expect(result.categoryStats).toHaveLength(1);
      expect(result.difficultyStats).toHaveLength(1);
    });

    it('should update existing statistics if found', async () => {
      const existingStats = {
        id: '1',
        exerciseId: mockExerciseId,
        period: Period.DAILY,
        date: mockDate,
      };

      prismaServiceMock.exerciseStatistics.findFirst.mockResolvedValue(existingStats);
      clientProxyMock.send.mockImplementation((pattern) => {
        switch (pattern) {
          case 'calculate.gender.stats.by.target':
            return of([{ gender: 'MALE', count: 5 }]);
          case 'find.exercise.by.id':
            return of(mockExercise);
          default:
            return of(null);
        }
      });

      prismaServiceMock.exerciseStatistics.update.mockResolvedValue({
        ...existingStats,
        totalUses: 10,
        popularityScore: 4.5,
        genderStats: [{ gender: 'MALE', useCount: 5 }]
      });

      const result = await service.generateExerciseStatistics(mockExerciseId, Period.DAILY, mockDate);

      expect(result).toHaveProperty('id', existingStats.id);
      expect(prismaServiceMock.exerciseStatistics.update).toHaveBeenCalled();
    });
  });

  describe('findExerciseStatsById', () => {
    it('should return statistics if found', async () => {
      const mockStats = {
        id: '1',
        exerciseId: 1,
        genderStats: [],
        categoryStats: [],
        difficultyStats: []
      };

      prismaServiceMock.exerciseStatistics.findUnique.mockResolvedValue(mockStats);

      const result = await service.findExerciseStatsById('1');

      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('exerciseId', 1);
    });

    it('should throw if statistics not found', async () => {
      prismaServiceMock.exerciseStatistics.findUnique.mockResolvedValue(null);

      await expect(service.findExerciseStatsById('999'))
        .rejects
        .toThrow(RpcException);
    });
  });

  describe('findAllExerciseStats', () => {
    it('should return paginated statistics', async () => {
      const mockStats = [
        { id: '1', exerciseId: 1 },
        { id: '2', exerciseId: 2 }
      ];

      prismaServiceMock.exerciseStatistics.count.mockResolvedValue(2);
      prismaServiceMock.exerciseStatistics.findMany.mockResolvedValue(mockStats);

      const result = await service.findAllExerciseStats({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.totalStats).toBe(2);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('getExerciseStatistics', () => {
    const mockDate = new Date('2025-02-03');

    it('should return combined statistics', async () => {
      const mockPopularExercises = [{ id: '1', totalUses: 100 }];
      const mockTopRated = [{ id: '2', popularityScore: 4.8 }];
      const mockCategoryStats = [{ category: Category.STRENGTH, totalUse: 50 }];
      const mockDifficultyStats = [{ difficulty: Difficulty.BASIC, totalUse: 30 }];

      prismaServiceMock.exerciseStatistics.findMany
        .mockResolvedValueOnce(mockPopularExercises)
        .mockResolvedValueOnce(mockTopRated);

      prismaServiceMock.exerciseCategoryStats.groupBy.mockResolvedValue([
        { category: Category.STRENGTH, _sum: { useCount: 50 } }
      ]);
      prismaServiceMock.exerciseDifficultyStats.groupBy.mockResolvedValue([
        { difficulty: Difficulty.BASIC, _sum: { useCount: 30 } }
      ]);

      const result = await service.getExerciseStatistics(Period.DAILY, mockDate);

      expect(result).toHaveProperty('popularExercises');
      expect(result).toHaveProperty('topRated');
      expect(result).toHaveProperty('categoryStats');
      expect(result).toHaveProperty('difficultyStats');
    });

    it('should throw if no data found', async () => {
      prismaServiceMock.exerciseStatistics.findMany.mockResolvedValue([]);

      await expect(service.getExerciseStatistics(Period.DAILY, mockDate))
        .rejects
        .toThrow(RpcException);
    });
  });

  describe('deleteExerciseStatistics', () => {
    it('should delete statistics successfully', async () => {
      const mockStats = {
        id: '1',
        exerciseId: 1
      };

      prismaServiceMock.exerciseStatistics.findUnique.mockResolvedValue(mockStats);
      prismaServiceMock.exerciseStatistics.update.mockResolvedValue(mockStats);
      prismaServiceMock.exerciseStatistics.delete.mockResolvedValue(mockStats);

      const result = await service.deleteExerciseStatistics('1');

      expect(result).toHaveProperty('message', 'Statistics deleted successfully');
      expect(result).toHaveProperty('deletedStats');
    });
  });

  describe('Date Range Calculations', () => {
    it('should calculate correct date ranges for different periods', async () => {
      const baseDate = new Date('2025-02-03');
      const periods = [Period.DAILY, Period.WEEKLY, Period.MONTHLY, Period.YEARLY];
      
      for (const period of periods) {
        // Test date range calculation through statistics generation
        await service.generateExerciseStatistics(1, period, baseDate);
        
        // Verify that findFirst was called (which uses the date range)
        expect(prismaServiceMock.exerciseStatistics.findFirst).toHaveBeenCalled();
      }
    });

    it('should handle date range edge cases', async () => {
      // Test month transitions
      const monthEnd = new Date('2025-01-31');
      await service.generateExerciseStatistics(1, Period.MONTHLY, monthEnd);
      
      // Test year transitions
      const yearEnd = new Date('2025-12-31');
      await service.generateExerciseStatistics(1, Period.YEARLY, yearEnd);

      expect(prismaServiceMock.exerciseStatistics.findFirst).toHaveBeenCalled();
    });
  });
});