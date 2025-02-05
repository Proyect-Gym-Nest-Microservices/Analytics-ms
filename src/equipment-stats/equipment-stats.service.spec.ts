import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentStatsService } from './equipment-stats.service';
import { RpcException } from '@nestjs/microservices';
import { Period } from '../common/enums/analytics.enum';
import { NATS_SERVICE } from '../config/services.config';
import { of } from 'rxjs';
import { TargetType } from '../common/enums/target-type.enum';
import { EquipmentStatisticsDto } from './dto/equipment.statistics.dto';

// Mock ClientProxy
const clientProxyMock = {
  send: jest.fn()
};

// Mock Prisma Client
const prismaServiceMock = {
  equipmentStatistics: {
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

describe('EquipmentStatsService', () => {
  let service: EquipmentStatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentStatsService,
        {
          provide: NATS_SERVICE,
          useValue: clientProxyMock
        }
      ],
    }).compile();

    service = module.get<EquipmentStatsService>(EquipmentStatsService);
    // Replace Prisma instance with mock
    Object.assign(service, prismaServiceMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEquipmentStatistics', () => {
    const mockDate = new Date('2025-02-03');
    const mockEquipmentDto: EquipmentStatisticsDto = {
      equipmentId: 1,
      period: Period.DAILY,
      date: mockDate
    };
    const mockEquipment = {
      id: 1,
      score: 4.5,
      totalRatings: 10
    };

    it('should create new statistics if none exist', async () => {
      // Mock dependencies
      prismaServiceMock.equipmentStatistics.findFirst.mockResolvedValue(null);
      clientProxyMock.send.mockImplementation((pattern) => {
        switch (pattern) {
          case 'calculate.gender.stats.by.target':
            return of([{ gender: 'MALE', count: 5 }]);
          case 'find.one.equipment':
            return of(mockEquipment);
          default:
            return of(null);
        }
      });

      // Mock creation
      prismaServiceMock.equipmentStatistics.create.mockResolvedValue({
        id: '1',
        equipmentId: mockEquipmentDto.equipmentId,
        period: Period.DAILY,
        date: mockDate,
        totalUses: 10,
        popularityScore: 4.5,
        genderStats: [{ gender: 'MALE', useCount: 5 }]
      });

      const result = await service.generateEquipmentStatistics(mockEquipmentDto);

      expect(result).toHaveProperty('equipmentId', mockEquipmentDto.equipmentId);
      expect(result.genderStats).toHaveLength(1);
    });

    it('should update existing statistics if found', async () => {
      const existingStats = {
        id: '1',
        equipmentId: mockEquipmentDto.equipmentId,
        period: Period.DAILY,
        date: mockDate,
      };

      prismaServiceMock.equipmentStatistics.findFirst.mockResolvedValue(existingStats);
      clientProxyMock.send.mockImplementation((pattern) => {
        switch (pattern) {
          case 'calculate.gender.stats.by.target':
            return of([{ gender: 'MALE', count: 5 }]);
          case 'find.one.equipment':
            return of(mockEquipment);
          default:
            return of(null);
        }
      });

      prismaServiceMock.equipmentStatistics.update.mockResolvedValue({
        ...existingStats,
        totalUses: 10,
        popularityScore: 4.5,
        genderStats: [{ gender: 'MALE', useCount: 5 }]
      });

      const result = await service.generateEquipmentStatistics(mockEquipmentDto);

      expect(result).toHaveProperty('id', existingStats.id);
      expect(prismaServiceMock.equipmentStatistics.update).toHaveBeenCalled();
    });
  });

  describe('findAllEquipmentStats', () => {
    it('should return paginated statistics', async () => {
      const mockStats = [
        { id: '1', equipmentId: 1 },
        { id: '2', equipmentId: 2 }
      ];

      prismaServiceMock.equipmentStatistics.count.mockResolvedValue(2);
      prismaServiceMock.equipmentStatistics.findMany.mockResolvedValue(mockStats);

      const result = await service.findAllEquipmentStats({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.totalStats).toBe(2);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('findEquipmentStatsById', () => {
    it('should return statistics if found', async () => {
      const mockStats = {
        id: '1',
        equipmentId: 1,
        genderStats: []
      };

      prismaServiceMock.equipmentStatistics.findUnique.mockResolvedValue(mockStats);

      const result = await service.findEquipmentStatsById('1');

      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('equipmentId', 1);
    });

    it('should throw if statistics not found', async () => {
      prismaServiceMock.equipmentStatistics.findUnique.mockResolvedValue(null);

      await expect(service.findEquipmentStatsById('999'))
        .rejects
        .toThrow(RpcException);
    });
  });

  describe('getEquipmentStatistics', () => {
    const mockDate = new Date('2025-02-03');

    it('should return combined statistics', async () => {
      const mockPopularEquipment = [{ id: '1', totalUses: 100 }];
      const mockTopRated = [{ id: '2', popularityScore: 4.8 }];

      prismaServiceMock.equipmentStatistics.findMany
        .mockResolvedValueOnce(mockPopularEquipment)
        .mockResolvedValueOnce(mockTopRated);

      const result = await service.getEquipmentStatistics(Period.DAILY, mockDate);

      expect(result).toHaveProperty('popularEquipment');
      expect(result).toHaveProperty('topRated');
    });

    it('should throw if no data found', async () => {
      prismaServiceMock.equipmentStatistics.findMany.mockResolvedValue([]);

      await expect(service.getEquipmentStatistics(Period.DAILY, mockDate))
        .rejects
        .toThrow(RpcException);
    });
  });

  describe('deleteEquipmentStatistics', () => {
    it('should delete statistics successfully', async () => {
      const mockStats = {
        id: '1',
        equipmentId: 1
      };

      prismaServiceMock.equipmentStatistics.findUnique.mockResolvedValue(mockStats);
      prismaServiceMock.equipmentStatistics.update.mockResolvedValue(mockStats);
      prismaServiceMock.equipmentStatistics.delete.mockResolvedValue(mockStats);

      const result = await service.deleteEquipmentStatistics('1');

      expect(result).toHaveProperty('message', 'Statistics deleted successfully');
      expect(result).toHaveProperty('deletedStats');
    });
  });

  describe('Date Range Calculations', () => {
    it('should calculate correct date ranges for different periods', async () => {
      const baseDate = new Date('2025-02-03');
      const mockEquipmentDto: EquipmentStatisticsDto = {
        equipmentId: 1,
        period: Period.DAILY,
        date: baseDate
      };
      
      for (const period of Object.values(Period)) {
        mockEquipmentDto.period = period;
        await service.generateEquipmentStatistics(mockEquipmentDto);
        expect(prismaServiceMock.equipmentStatistics.findFirst).toHaveBeenCalled();
      }
    });

    it('should handle date range edge cases', async () => {
      const mockEquipmentDto: EquipmentStatisticsDto = {
        equipmentId: 1,
        period: Period.MONTHLY,
        date: new Date('2025-01-31')
      };

      await service.generateEquipmentStatistics(mockEquipmentDto);
      
      mockEquipmentDto.period = Period.YEARLY;
      mockEquipmentDto.date = new Date('2025-12-31');
      await service.generateEquipmentStatistics(mockEquipmentDto);

      expect(prismaServiceMock.equipmentStatistics.findFirst).toHaveBeenCalled();
    });
  });
});