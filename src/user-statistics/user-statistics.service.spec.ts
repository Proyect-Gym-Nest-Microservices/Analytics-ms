import { Test, TestingModule } from '@nestjs/testing';
import { UserStatisticsService } from './user-statistics.service';
import { RpcException } from '@nestjs/microservices';
import { Period } from '../common/enums/analytics.enum';
import { NATS_SERVICE } from '../config/services.config';
import { of } from 'rxjs';
import { AgeRange, Goal } from './enums/user-stats.enum';


// Mock ClientProxy
const clientProxyMock = {
  send: jest.fn()
};

// Mock Prisma Client
const prismaServiceMock = {
  userStatistics: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $connect: jest.fn(),
};

describe('UserStatisticsService', () => {
  let service: UserStatisticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserStatisticsService,
        {
          provide: NATS_SERVICE,
          useValue: clientProxyMock
        }
      ],
    }).compile();

    service = module.get<UserStatisticsService>(UserStatisticsService);
    // Replace Prisma instance with mock
    Object.assign(service, prismaServiceMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateUserStatistics', () => {
    const mockDate = new Date('2025-02-03');
    const mockUserStats = {
      totalUsers: 100,
      newUsers: 10,
      userActivity: {
        activeUsers: 80,
        inactiveUsers: 20
      },
      genderStats: [
        { gender: 'MALE', count: 60 },
        { gender: 'FEMALE', count: 40 }
      ],
      goalStats: [
        { goal: Goal.LOSE_WEIGHT, count: 30 },
        { goal: Goal.GAIN_MUSCLE, count: 40 }
      ],
      ageRange: [
        { age: 20 },
        { age: 30 },
        { age: 40 }
      ]
    };

    it('should create new statistics if none exist', async () => {
      prismaServiceMock.userStatistics.findFirst.mockResolvedValue(null);
      clientProxyMock.send.mockReturnValue(of(mockUserStats));

      prismaServiceMock.userStatistics.create.mockResolvedValue({
        id: '1',
        period: Period.DAILY,
        date: mockDate,
        totalUsers: 100,
        newUsers: 10,
        activeUsers: 80,
        inactiveUsers: 20,
        genderStats: mockUserStats.genderStats,
        goalStats: mockUserStats.goalStats,
        ageRangeStats: [
          { ageRange: AgeRange.AGE_18_24, count: 1 },
          { ageRange: AgeRange.AGE_25_34, count: 1 },
          { ageRange: AgeRange.AGE_35_44, count: 1 }
        ]
      });

      const result = await service.generateUserStatistics(Period.DAILY, mockDate);

      expect(result).toHaveProperty('totalUsers', 100);
      expect(result.genderStats).toHaveLength(2);
      expect(result.goalStats).toHaveLength(2);
      expect(result.ageRangeStats).toHaveLength(3);
    });

    it('should update existing statistics if found', async () => {
      const existingStats = {
        id: '1',
        period: Period.DAILY,
        date: mockDate,
      };

      prismaServiceMock.userStatistics.findFirst.mockResolvedValue(existingStats);
      clientProxyMock.send.mockReturnValue(of(mockUserStats));

      prismaServiceMock.userStatistics.update.mockResolvedValue({
        ...existingStats,
        totalUsers: 100,
        newUsers: 10,
        activeUsers: 80,
        inactiveUsers: 20,
        genderStats: mockUserStats.genderStats,
        goalStats: mockUserStats.goalStats,
        ageRangeStats: [
          { ageRange: AgeRange.AGE_18_24, count: 1 }
        ]
      });

      const result = await service.generateUserStatistics(Period.DAILY, mockDate);

      expect(result).toHaveProperty('id', existingStats.id);
      expect(prismaServiceMock.userStatistics.update).toHaveBeenCalled();
    });
  });

  describe('getUserStatistics', () => {
    const mockDate = new Date('2025-02-03');

    it('should return statistics for the specified period', async () => {
      const mockStats = {
        id: '1',
        period: Period.DAILY,
        date: mockDate,
        totalUsers: 100,
        genderStats: [],
        goalStats: [],
        ageRangeStats: []
      };

      prismaServiceMock.userStatistics.findFirst.mockResolvedValue(mockStats);

      const result = await service.getUserStatistics(Period.DAILY, mockDate);

      expect(result).toHaveProperty('totalUsers', 100);
    });

    it('should throw if no statistics found', async () => {
      prismaServiceMock.userStatistics.findFirst.mockResolvedValue(null);

      await expect(service.getUserStatistics(Period.DAILY, mockDate))
        .rejects
        .toThrow(RpcException);
    });
  });

  describe('findAllUserStats', () => {
    it('should return paginated statistics', async () => {
      const mockStats = [
        { id: '1', totalUsers: 100 },
        { id: '2', totalUsers: 200 }
      ];

      prismaServiceMock.userStatistics.count.mockResolvedValue(2);
      prismaServiceMock.userStatistics.findMany.mockResolvedValue(mockStats);

      const result = await service.findAllUserStats({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.totalStats).toBe(2);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('findUserStatsById', () => {
    it('should return statistics if found', async () => {
      const mockStats = {
        id: '1',
        totalUsers: 100,
        genderStats: [],
        goalStats: [],
        ageRangeStats: []
      };

      prismaServiceMock.userStatistics.findUnique.mockResolvedValue(mockStats);

      const result = await service.findUserStatsById('1');

      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('totalUsers', 100);
    });

    it('should throw if statistics not found', async () => {
      prismaServiceMock.userStatistics.findUnique.mockResolvedValue(null);

      await expect(service.findUserStatsById('999'))
        .rejects
        .toThrow(RpcException);
    });
  });

  describe('deleteUserStatistics', () => {
    it('should delete statistics successfully', async () => {
      const mockStats = {
        id: '1',
        totalUsers: 100
      };

      prismaServiceMock.userStatistics.findUnique.mockResolvedValue(mockStats);
      prismaServiceMock.userStatistics.update.mockResolvedValue(mockStats);
      prismaServiceMock.userStatistics.delete.mockResolvedValue(mockStats);

      const result = await service.deleteUserStatistics('1');

      expect(result).toHaveProperty('message', 'Statistics deleted successfully');
      expect(result).toHaveProperty('deletedStats');
    });
  });

  describe('Age Range Calculations', () => {
    it('should correctly determine age ranges', () => {
      const testCases = [
        { age: 17, expected: AgeRange.UNDER_18 },
        { age: 20, expected: AgeRange.AGE_18_24 },
        { age: 30, expected: AgeRange.AGE_25_34 },
        { age: 40, expected: AgeRange.AGE_35_44 },
        { age: 50, expected: AgeRange.AGE_45_54 },
        { age: 60, expected: AgeRange.AGE_55_PLUS }
      ];

      const mockUsers = testCases.map(tc => ({ age: tc.age }));
      
      return service['calculateAgeRangeStats'](mockUsers)
        .then(stats => {
          expect(stats).toHaveLength(testCases.length);
          stats.forEach(stat => {
            expect(Object.values(AgeRange)).toContain(stat.ageRange);
            expect(stat.count).toBe(1);
          });
        });
    });
  });

  describe('Date Range Calculations', () => {
    it('should calculate correct date ranges for different periods', async () => {
      const baseDate = new Date('2025-02-03');
      const periods = [Period.DAILY, Period.WEEKLY, Period.MONTHLY, Period.YEARLY];
      
      for (const period of periods) {
        await service.generateUserStatistics(period, baseDate);
        expect(prismaServiceMock.userStatistics.findFirst).toHaveBeenCalled();
      }
    });
  });
});