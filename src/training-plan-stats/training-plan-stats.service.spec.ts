import { Test, TestingModule } from '@nestjs/testing';
import { TrainingPlanStatsService } from './training-plan-stats.service';
import { RpcException } from '@nestjs/microservices';
import { Period } from '../common/enums/analytics.enum';
import { NATS_SERVICE } from '../config/services.config';
import { of } from 'rxjs';
import { TargetType } from '../common/enums/target-type.enum';
import { Difficulty } from '../common/enums/analytics.enum';

// Mock ClientProxy
const clientProxyMock = {
  send: jest.fn()
};

// Mock Prisma Client
const prismaServiceMock = {
  trainingPlanStatistics: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  trainingPlanDifficultyStats: {
    groupBy: jest.fn(),
  },
  $connect: jest.fn(),
};

describe('TrainingPlanStatsService', () => {
  let service: TrainingPlanStatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingPlanStatsService,
        {
          provide: NATS_SERVICE,
          useValue: clientProxyMock
        }
      ],
    }).compile();

    service = module.get<TrainingPlanStatsService>(TrainingPlanStatsService);
    // Replace Prisma instance with mock
    Object.assign(service, prismaServiceMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTrainingPlanStatistics', () => {
    const mockDate = new Date('2025-02-03');
    const mockTrainingPlanId = 1;
    const mockTrainingPlan = {
      id: mockTrainingPlanId,
      totalRatings: 10,
      level: Difficulty.BASIC,
      score: 4.5
    };

    it('should create new statistics if none exist', async () => {
      // Mock dependencies
      prismaServiceMock.trainingPlanStatistics.findFirst.mockResolvedValue(null);
      clientProxyMock.send.mockImplementation((pattern) => {
        switch (pattern) {
          case 'calculate.gender.stats.by.target':
            return of([{ gender: 'MALE', count: 5 }]);
          case 'find.training.plan.by.id':
            return of(mockTrainingPlan);
          default:
            return of(null);
        }
      });

      // Mock creation
      prismaServiceMock.trainingPlanStatistics.create.mockResolvedValue({
        id: '1',
        trainingPlanId: mockTrainingPlanId,
        period: Period.DAILY,
        date: mockDate,
        totalCompletions: 10,
        genderStats: [{ gender: 'MALE', completionCount: 5 }],
        difficultyStats: [{ difficulty: Difficulty.BASIC, completionCount: 10 }]
      });

      const result = await service.generateTrainingPlanStatistics(mockTrainingPlanId, Period.DAILY, mockDate);

      expect(result).toHaveProperty('trainingPlanId', mockTrainingPlanId);
      expect(result.genderStats).toHaveLength(1);
      expect(result.difficultyStats).toHaveLength(1);
    });

    it('should update existing statistics if found', async () => {
      const existingStats = {
        id: '1',
        trainingPlanId: mockTrainingPlanId,
        period: Period.DAILY,
        date: mockDate,
      };

      prismaServiceMock.trainingPlanStatistics.findFirst.mockResolvedValue(existingStats);
      clientProxyMock.send.mockImplementation((pattern) => {
        switch (pattern) {
          case 'calculate.gender.stats.by.target':
            return of([{ gender: 'MALE', count: 5 }]);
          case 'find.training.plan.by.id':
            return of(mockTrainingPlan);
          default:
            return of(null);
        }
      });

      prismaServiceMock.trainingPlanStatistics.update.mockResolvedValue({
        ...existingStats,
        totalCompletions: 10,
        genderStats: [{ gender: 'MALE', completionCount: 5 }],
        difficultyStats: [{ difficulty: Difficulty.BASIC, completionCount: 10 }]
      });

      const result = await service.generateTrainingPlanStatistics(mockTrainingPlanId, Period.DAILY, mockDate);

      expect(result).toHaveProperty('id', existingStats.id);
      expect(prismaServiceMock.trainingPlanStatistics.update).toHaveBeenCalled();
    });
  });

  describe('findAllTrainingPlanStats', () => {
    it('should return paginated statistics', async () => {
      const mockStats = [
        { id: '1', trainingPlanId: 1 },
        { id: '2', trainingPlanId: 2 }
      ];

      prismaServiceMock.trainingPlanStatistics.count.mockResolvedValue(2);
      prismaServiceMock.trainingPlanStatistics.findMany.mockResolvedValue(mockStats);

      const result = await service.findAllTrainingPlanStats({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.totalStats).toBe(2);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('findTrainingPlanStatsById', () => {
    it('should return statistics if found', async () => {
      const mockStats = {
        id: '1',
        trainingPlanId: 1,
        genderStats: [],
        difficultyStats: []
      };

      prismaServiceMock.trainingPlanStatistics.findUnique.mockResolvedValue(mockStats);

      const result = await service.findTrainingPlanStatsById('1');

      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('trainingPlanId', 1);
    });

    it('should throw if statistics not found', async () => {
      prismaServiceMock.trainingPlanStatistics.findUnique.mockResolvedValue(null);

      await expect(service.findTrainingPlanStatsById('999'))
        .rejects
        .toThrow(RpcException);
    });
  });

  describe('getTrainingPlanStatistics', () => {
    const mockDate = new Date('2025-02-03');

    it('should return combined statistics', async () => {
      const mockPopularPlans = [{ id: '1', totalCompletions: 100 }];
      const mockDifficultyStats = [{ difficulty: Difficulty.BASIC, completionCount: 50 }];

      prismaServiceMock.trainingPlanStatistics.findMany.mockResolvedValue(mockPopularPlans);
      prismaServiceMock.trainingPlanDifficultyStats.groupBy.mockResolvedValue([
        { difficulty: Difficulty.BASIC, _sum: { completionCount: 50 } }
      ]);

      const result = await service.getTrainingPlanStatistics(Period.DAILY, mockDate);

      expect(result).toHaveProperty('popularTrainingPlans');
      expect(result).toHaveProperty('difficultyStats');
    });

    it('should throw if no data found', async () => {
      prismaServiceMock.trainingPlanStatistics.findMany.mockResolvedValue([]);

      await expect(service.getTrainingPlanStatistics(Period.DAILY, mockDate))
        .rejects
        .toThrow(RpcException);
    });
  });

  describe('deleteTrainingPlanStatistics', () => {
    it('should delete statistics successfully', async () => {
      const mockStats = {
        id: '1',
        trainingPlanId: 1
      };

      prismaServiceMock.trainingPlanStatistics.findUnique.mockResolvedValue(mockStats);
      prismaServiceMock.trainingPlanStatistics.update.mockResolvedValue(mockStats);
      prismaServiceMock.trainingPlanStatistics.delete.mockResolvedValue(mockStats);

      const result = await service.deleteTrainingPlanStatistics('1');

      expect(result).toHaveProperty('message', 'Statistics deleted successfully');
      expect(result).toHaveProperty('deletedStats');
    });
  });

  describe('Date Range Calculations', () => {
    it('should calculate correct date ranges for different periods', async () => {
      const baseDate = new Date('2025-02-03');
      const periods = [Period.DAILY, Period.WEEKLY, Period.MONTHLY, Period.YEARLY];
      
      for (const period of periods) {
        await service.generateTrainingPlanStatistics(1, period, baseDate);
        expect(prismaServiceMock.trainingPlanStatistics.findFirst).toHaveBeenCalled();
      }
    });
  });
});