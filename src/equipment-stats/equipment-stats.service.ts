import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UpdateEquipmentStatDto } from './dto/update-equipment-stat.dto';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { Period } from 'src/common/enums/analytics.enum';
import { firstValueFrom } from 'rxjs';
import { EquipmentStatisticsDto } from './dto';

@Injectable()
export class EquipmentStatsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('Equipment-Statistics-Service');

  //constructor(
  //  @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  //) { 
  //  super()
  //}

  async onModuleInit() {
    await this.$connect();
    this.logger.log('DataBase connected');
  }

  //async createEquipmentStatistics(equipmentStatisticsDto: EquipmentStatisticsDto) {
  //  try {
  //    const equipmentStats = 'setDefaultAutoSelectFamily';
  //    return equipmentStats;

  //  } catch (error) {
  //    throw new RpcException({
  //      status: HttpStatus.INTERNAL_SERVER_ERROR,
  //      message: 'Internal server error'
  //    });
  //  }
  //}

  //async findStatsByEquipmentId(equipmentId: number, period: Period) {
  //  try {
  //    const stats = await this.equipmentStatistics.findFirst({
  //      where: {
  //        equipmentId,
  //        period
  //      },
  //      include: {
  //        equipment: true,
  //        genderStats: true
  //      }
  //    });

  //    if (!stats) {
  //      throw new RpcException({
  //        status: HttpStatus.NOT_FOUND,
  //        message: 'Statistics not found for this equipment and period'
  //      });
  //    }

  //    return stats;

  //  } catch (error) {
  //    if (error instanceof RpcException) {
  //      throw error;
  //    }
  //    throw new RpcException({
  //      status: HttpStatus.INTERNAL_SERVER_ERROR,
  //      message: 'Internal server error'
  //    });
  //  }
  //}

  //async findAllEquipmentStats(period: Period) {
  //  try {
  //    const stats = await this.equipmentStatistics.findMany({
  //      where: { period },
  //      include: {
  //        equipment: true,
  //        genderStats: true
  //      },
  //      orderBy: {
  //        popularityScore: 'desc'
  //      }
  //    });

  //    return stats;

  //  } catch (error) {
  //    throw new RpcException({
  //      status: HttpStatus.INTERNAL_SERVER_ERROR,
  //      message: 'Internal server error'
  //    });
  //  }
  //}

  //async updateEquipmentStats(equipmentId: number, period: Period, updateStatsDto: EquipmentStatisticsDto) {
  //  try {
  //    await this.findStatsByEquipmentId(equipmentId, period);

  //    const updatedStats = await this.equipmentStatistics.update({
  //      where: {
  //        equipmentId_period: {
  //          equipmentId,
  //          period
  //        }
  //      },
  //      data: {
  //        date: updateStatsDto.date,
  //        totalUses: updateStatsDto.totalUses,
  //        popularityScore: updateStatsDto.popularityScore,
  //        genderStats: {
  //          deleteMany: {},
  //          create: updateStatsDto.genderStats.map(stat => ({
  //            gender: stat.gender,
  //            useCount: stat.useCount
  //          }))
  //        }
  //      },
  //      include: {
  //        equipment: true,
  //        genderStats: true
  //      }
  //    });

  //    const { createdAt, updatedAt, ...statsData } = updatedStats;
  //    return statsData;

  //  } catch (error) {
  //    if (error instanceof RpcException) {
  //      throw error;
  //    }
  //    throw new RpcException({
  //      status: HttpStatus.INTERNAL_SERVER_ERROR,
  //      message: 'Internal server error'
  //    });
  //  }
  //}

  //async deleteEquipmentStats(equipmentId: number, period: Period) {
  //  try {
  //    await this.findStatsByEquipmentId(equipmentId, period);

  //    await this.equipmentStatistics.delete({
  //      where: {
  //        equipmentId_period: {
  //          equipmentId,
  //          period
  //        }
  //      }
  //    });

  //    return {
  //      message: 'Equipment statistics deleted successfully'
  //    };

  //  } catch (error) {
  //    if (error instanceof RpcException) {
  //      throw error;
  //    }
  //    throw new RpcException({
  //      status: HttpStatus.INTERNAL_SERVER_ERROR,
  //      message: 'Internal server error'
  //    });
  //  }
  //}

  //async getTopEquipmentsByPopularity(period: Period, limit: number = 10) {
  //  try {
  //    const topEquipments = await this.equipmentStatistics.findMany({
  //      where: { period },
  //      orderBy: {
  //        popularityScore: 'desc'
  //      },
  //      take: limit,
  //      include: {
  //        equipment: true,
  //        genderStats: true
  //      }
  //    });

  //    return topEquipments;

  //  } catch (error) {
  //    throw new RpcException({
  //      status: HttpStatus.INTERNAL_SERVER_ERROR,
  //      message: 'Internal server error'
  //    });
  //  }
  //}

  //async getGenderDistributionByEquipment(equipmentId: number, period: Period) {
  //  try {
  //    const stats = await this.findStatsByEquipmentId(equipmentId, period);
      
  //    const totalUses = stats.genderStats.reduce((acc, stat) => acc + stat.useCount, 0);
      
  //    const distribution = stats.genderStats.map(stat => ({
  //      gender: stat.gender,
  //      useCount: stat.useCount,
  //      percentage: (stat.useCount / totalUses) * 100
  //    }));

  //    return {
  //      equipmentId,
  //      period,
  //      distribution
  //    };

  //  } catch (error) {
  //    if (error instanceof RpcException) {
  //      throw error;
  //    }
  //    throw new RpcException({
  //      status: HttpStatus.INTERNAL_SERVER_ERROR,
  //      message: 'Internal server error'
  //    });
  //  }
  //}

}
