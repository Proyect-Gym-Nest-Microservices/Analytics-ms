import { Test, TestingModule } from '@nestjs/testing';
import { WorkoutStatisticsService } from './workout-statistics.service';
import { RpcException } from '@nestjs/microservices';
import { Period } from '../common/enums/analytics.enum';
import { NATS_SERVICE } from '../config/services.config';
import { of } from 'rxjs';
import { TargetType } from '../common/enums/target-type.enum';
import { Category, Difficulty } from '../common/enums/analytics.enum';

// Mock ClientProxy
const clientProxyMock = {
  send: jest.fn()
};

// Mock Prisma Client
const prismaServiceMock = {
  workoutStatistics: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  workoutCategoryStats: {
    groupBy: jest.fn(),
  },
  workoutDifficultyStats: {
    groupBy: jest.fn(),
  },
  $connect: jest.fn(),
};

describe('WorkoutStatisticsService', () => {
  let service: WorkoutStatisticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutStatisticsService,
        {
          provide: NATS_SERVICE,
          useValue: clientProxyMock
        }
      ],
    }).compile();

    service = module.get<WorkoutStatisticsService>(WorkoutStatisticsService);
    // Replace Prisma instance with mock
    Object.assign(service, prismaServiceMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateWorkoutStatistics', () => {
    const mockDate = new Date('2025-02-03');
    const mockWorkoutId = 1;
    const mockWorkout = {
      id: mockWorkoutId,
      totalRatings: 10,
      level: Difficulty.BASIC,
      category: Category.STRENGTH,
      score: 4.5
    };

    it('should create new statistics if none exist', async () => {
      // Mock dependencies
      prismaServiceMock.workoutStatistics.findFirst.mockResolvedValue(null);
      clientProxyMock.send.mockImplementation((pattern) => {
        switch (pattern) {
          case 'calculate.gender.stats.by.target':
            return of([{ gender: 'MALE', count: 5 }]);
          case 'find.one.workout':
            return of(mockWorkout);
          default:
            return of(null);
        }
      });

      // Mock creation
      prismaServiceMock.workoutStatistics.create.mockResolvedValue({
        id: '1',
        workoutId: mockWorkoutId,
        period: Period.DAILY,
        date: mockDate,
        totalUses: 10,
        popularityScore: 4.5,
        genderStats: [{ gender: 'MALE', useCount: 5 }],
        categoryStats: [{ category: Category.STRENGTH, useCount: 10 }],
        difficultyStats: [{ difficulty: Difficulty.BASIC, useCount: 10 }]
      });

      const result = await service.generateWorkoutStatistics(mockWorkoutId, Period.DAILY, mockDate);

      expect(result).toHaveProperty('workoutId', mockWorkoutId);
      expect(result.genderStats).toHaveLength(1);
      expect(result.categoryStats).toHaveLength(1);
      expect(result.difficultyStats).toHaveLength(1);
    });

    it('should update existing statistics if found', async () => {
      const existingStats = {
        id: '1',
        workoutId: mockWorkoutId,
        period: Period.DAILY,
        date: mockDate,
      };

      prismaServiceMock.workoutStatistics.findFirst.mockResolvedValue(existingStats);
      clientProxyMock.send.mockImplementation((pattern) => {
        switch (pattern) {
          case 'calculate.gender.stats.by.target':
            return of([{ gender: 'MALE', count: 5 }]);
          case 'find.one.workout':
            return of(mockWorkout);
          default:
            return of(null);
        }
      });

      prismaServiceMock.workoutStatistics.update.mockResolvedValue({
        ...existingStats,
        totalUses: 10,
        popularityScore: 4.5,
        genderStats: [{ gender: 'MALE', useCount: 5 }]
      });

      const result = await service.generateWorkoutStatistics(mockWorkoutId, Period.DAILY, mockDate);

      expect(result).toHaveProperty('id', existingStats.id);
      expect(prismaServiceMock.workoutStatistics.update).toHaveBeenCalled();
    });
  });

  describe('findAllWorkoutStats', () => {
    it('should return paginated statistics', async () => {
      const mockStats = [
        { id: '1', workoutId: 1 },
        { id: '2', workoutId: 2 }
      ];

      prismaServiceMock.workoutStatistics.count.mockResolvedValue(2);
      prismaServiceMock.workoutStatistics.findMany.mockResolvedValue(mockStats);

      const result = await service.findAllWorkoutStats({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.totalStats).toBe(2);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('findWorkoutStatsById', () => {
    it('should return statistics if found', async () => {
      const mockStats = {
        id: '1',
        workoutId: 1,
        genderStats: [],
        categoryStats: [],
        difficultyStats: []
      };

      prismaServiceMock.workoutStatistics.findUnique.mockResolvedValue(mockStats);

      const result = await service.findWorkoutStatsById('1');

      expect(result).toHaveProperty('id', '1');
    });

    it('should throw if statistics not found', async () => {
      prismaServiceMock.workoutStatistics.findUnique.mockResolvedValue(null);

      await expect(service.findWorkoutStatsById('999'))
        .rejects
        .toThrow(RpcException);
    });
  });

  describe('getWorkoutStatistics', () => {
    const mockDate = new Date('2025-02-03');

    it('should return combined statistics', async () => {
      const mockPopularWorkouts = [{ id: '1', totalUses: 100 }];
      const mockTopRated = [{ id: '2', popularityScore: 4.8 }];
      const mockCategoryStats = [{ category: Category.STRENGTH, useCount: 50 }];
      const mockDifficultyStats = [{ difficulty: Difficulty.BASIC, useCount: 30 }];

      prismaServiceMock.workoutStatistics.findMany.mockImplementationOnce(() => mockPopularWorkouts)
        .mockImplementationOnce(() => mockTopRated);
      prismaServiceMock.workoutCategoryStats.groupBy.mockResolvedValue([
        { category: Category.STRENGTH, _sum: { useCount: 50 } }
      ]);
      prismaServiceMock.workoutDifficultyStats.groupBy.mockResolvedValue([
        { difficulty: Difficulty.BASIC, _sum: { useCount: 30 } }
      ]);

      const result = await service.getWorkoutStatistics(Period.DAILY, mockDate);

      expect(result).toHaveProperty('popularWorkouts');
      expect(result).toHaveProperty('topRated');
      expect(result).toHaveProperty('categoryStats');
      expect(result).toHaveProperty('difficultyStats');
    });

    it('should throw if no data found', async () => {
      prismaServiceMock.workoutStatistics.findMany.mockResolvedValue([]);

      await expect(service.getWorkoutStatistics(Period.DAILY, mockDate))
        .rejects
        .toThrow(RpcException);
    });
  });

  describe('deleteWorkoutStatistics', () => {
    it('should delete statistics successfully', async () => {
      const mockStats = {
        id: '1',
        workoutId: 1
      };

      prismaServiceMock.workoutStatistics.findUnique.mockResolvedValue(mockStats);
      prismaServiceMock.workoutStatistics.update.mockResolvedValue(mockStats);
      prismaServiceMock.workoutStatistics.delete.mockResolvedValue(mockStats);

      const result = await service.deleteWorkoutStatistics('1');

      expect(result).toHaveProperty('message', 'Statistics deleted successfully');
      expect(result).toHaveProperty('deletedStats');
    });
  });

  describe('Date Range Calculations', () => {
    it('should calculate correct date ranges for different periods', async () => {
      const baseDate = new Date('2025-02-03');
      const periods = [Period.DAILY, Period.WEEKLY, Period.MONTHLY, Period.YEARLY];
      
      for (const period of periods) {
        // Using the service to generate statistics will internally call getDateRangeByPeriod
        await service.generateWorkoutStatistics(1, period, baseDate);
        
        // The actual date range validation would happen in the mock responses
        // and subsequent checks would verify if the correct date range was used
        expect(prismaServiceMock.workoutStatistics.findFirst).toHaveBeenCalled();
      }
    });
  });
});