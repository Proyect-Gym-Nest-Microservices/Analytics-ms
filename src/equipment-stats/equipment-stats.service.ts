import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { Period } from 'src/common/enums/analytics.enum';
import { firstValueFrom } from 'rxjs';
import { TargetType } from 'src/common/enums/target-type.enum';
import { EquipmentStatisticsDto } from './dto/equipment.statistics.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class EquipmentStatsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(EquipmentStatsService.name);
  private static readonly TOP_ITEMS_LIMIT = 5;


  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {
    super()
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('DataBase connected');
  }

  private handleError(error: any, defaultMessage: string, httpStatus: HttpStatus) {
    if (error instanceof RpcException) {
      throw error;
    }
    throw new RpcException({
      status: httpStatus,
      message: error.message || defaultMessage,
    });
  }

  private getDateRangeByPeriod(date: Date, period: Period): { startDate: Date; endDate: Date } {
    const startDate = new Date(date);
    const endDate = new Date(date);
    try {
      switch (period) {
        case Period.DAILY:
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case Period.WEEKLY:
          startDate.setDate(date.getDate() - ((date.getDay() + 6) % 7));
          endDate.setDate(startDate.getDate() + 6);
          break;
        case Period.MONTHLY:
          startDate.setDate(1);
          endDate.setMonth(endDate.getMonth() + 1);
          endDate.setDate(0);
          break;
        case Period.YEARLY:
          startDate.setMonth(0, 1);
          endDate.setMonth(11, 31);
          break;
      }

      return { startDate, endDate };
    } catch (error) {
      this.handleError(
        error,
        'Error calculating date range',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateEquipmentStatistics(equipmentStatisticsDto: EquipmentStatisticsDto) {
    const {equipmentId,date,period} = equipmentStatisticsDto
    try {
      const { startDate, endDate } = this.getDateRangeByPeriod(date, period);

      const [existingStats, genderStats, equipment] = await Promise.all([
        this.equipmentStatistics.findFirst({
          where: {
            equipmentId,
            period,
            date: {
              gte: startDate,
              lte: endDate,
            }
          },
        }),
        this.calculateGenderStats(equipmentId, TargetType.EQUIPMENT),
        this.findEquipmentById(equipmentId),
      ]);


      const genderStatsData = (genderStats?.length ? genderStats.map(stat => ({
        gender: stat.gender,
        useCount: stat.count 
      })) : [])

      if (existingStats) {
        const updatedStats = this.equipmentStatistics.update({
          where: { id: existingStats.id },
          data: {
            equipmentId: existingStats.equipmentId,
            popularityScore: equipment.score,
            totalUses: equipment.totalRatings,
            genderStats: {
              deleteMany: {},
              ...(genderStatsData.length > 0 && {
                createMany: {
                  data: genderStatsData,
                },
              }),
            }
          },
          include: {
            genderStats:true
          }
        })
        this.logger.log(`Statistics updated for period ${period} and date ${date}`);
        return updatedStats;
      }

      const equipmentStats = await this.equipmentStatistics.create({
        data: {
          period,
          date,
          equipmentId,
          popularityScore: equipment.score,
          totalUses: equipment.totalRatings,
          ...(genderStatsData.length > 0 && {
            genderStats: {
              createMany: {
                data: genderStatsData,
              },
            },
          }),
        },
        include: {
          genderStats: true
        }
      })

      return equipmentStats


    } catch (error) {
      this.handleError(
        error,
        'Error generating equipment statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAllEquipmentStats(paginationDto:PaginationDto) {
    const { limit=10, page=1 } = paginationDto
    try {
      
      const totalStats = await this.equipmentStatistics.count();
      const lastPage = Math.ceil(totalStats / limit)
      return {
        data:await this.equipmentStatistics.findMany({
          skip: (page - 1) * limit,
          take:limit,
          include: {
            genderStats: true,
          },
          orderBy: {
            date: 'desc'
          }
        }),
        meta: {
          totalStats,
          page,
          lastPage
        }
      };
      
    } catch (error) {
      this.handleError(
        error,
        'Error retrieving all equipment statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findEquipmentStatsById(statisticsId: string) {
  
    try {
      const statistic = await this.equipmentStatistics.findUnique({
        where: { id: statisticsId },
        include: { genderStats: true },
      });
      if (!statistic) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Statistics with ID ${statisticsId} not found.`,
        });
      }
  
      return statistic;

    } catch (error) {
      this.handleError(
        error,
        `Error retrieving equipment statistics with ID ${statisticsId}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  

  async getEquipmentStatistics(period:Period,date:Date) {
    try {
      const { startDate, endDate } = this.getDateRangeByPeriod(date, period);
   
      const [popularEquipment, topRated] = await Promise.all([
        this.findMostPopularEquipment(startDate, endDate),
        this.findTopRatedEquipment(startDate, endDate),
      ]);

      if (!popularEquipment.length && !topRated.length) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'No data found for the specified period.',
        });
      }

      
      return {
        popularEquipment,
        topRated,
      };
    } catch (error) {
      this.handleError(
        error,
        'Error retrieving equipment statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    
  }
  
  async deleteEquipmentStatistics(statisticsId: string) {
    try {

      const existingStats = await this.findEquipmentStatsById(statisticsId)

      await this.equipmentStatistics.update({
        where: { id: existingStats.id },
        data: {
          genderStats: {
            deleteMany: {} 
          }
        }
      });

      const deletedStats = await this.equipmentStatistics.delete({
        where: { id: statisticsId },
      });

      this.logger.log(`Statistics with ID ${statisticsId} successfully deleted`);
      return {
        message: 'Statistics deleted successfully',
        deletedStats
      };

    } catch (error) {
      this.handleError(
        error,
        `Error deleting equipment statistics with ID ${statisticsId}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  private async findMostPopularEquipment(startDate: Date, endDate: Date) {
    return this.equipmentStatistics.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { totalUses: 'desc' },
      include: { genderStats: true },
      take: EquipmentStatsService.TOP_ITEMS_LIMIT,
    });
  }

  private async findTopRatedEquipment(startDate: Date, endDate: Date) {
    return this.equipmentStatistics.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { popularityScore: 'desc' },
      include: { genderStats: true },
      take: EquipmentStatsService.TOP_ITEMS_LIMIT,
    });
  }

  private async calculateGenderStats(
    targetId: number, targetType: TargetType
  ) {

    try {
      return await firstValueFrom(
        this.client.send('calculate.gender.stats.by.target', { targetId, targetType })
      )
    } catch (error) {
      this.logger.error('Error getting statistics equipment', error);
      throw error;
    }

  }

  private async findEquipmentById(equipmentId: number) {
    try {
      return await firstValueFrom(
        this.client.send('find.one.equipment', { id: equipmentId })
      )
    } catch (error) {
      this.logger.error('Error finding equipment', error);
      throw error;
    }
  }

}
