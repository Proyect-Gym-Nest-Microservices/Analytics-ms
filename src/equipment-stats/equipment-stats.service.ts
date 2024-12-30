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
  }

  //async calculateEquipmentStatistics(equipmentId: number, period: Period, date: Date): Promise<EquipmentStatisticsDto> {
  //  try {
  //    const { startDate, endDate } = this.getDateRangeByPeriod(date, period);

  //    // Obtener estadísticas por género
  //    const genderStats = await this.calculateGenderStats(equipmentId, startDate, endDate);

  //    // Calcular usos totales
  //    const totalUses = genderStats.reduce((sum, stat) => sum + stat.useCount, 0);

  //    // Calcular popularityScore (ejemplo: basado en el promedio de usos diarios)
  //    const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  //    const popularityScore = totalUses / daysInPeriod;

  //    return {
  //      period,
  //      date,
  //      equipmentId,
  //      totalUses,
  //      popularityScore,
  //      genderStats
  //    };
  //  } catch (error) {
  //    this.handleError(
  //      error,
  //      'Error calculating equipment statistics',
  //      HttpStatus.INTERNAL_SERVER_ERROR
  //    );
  //  }
  //}

  //private async calculateGenderStats(
  //  equipmentId: number, 
  //  startDate: Date, 
  //  endDate: Date
  //): Promise<{ gender: Gender; useCount: number }[]> {
  //  // Realizamos la agrupación por género en una única consulta
  //  const genderStats = await this.rating.groupBy({
  //    by: ['user.gender'], // Agrupamos por el campo `user.gender`
  //    _count: {
  //      id: true, // Contamos las filas agrupadas
  //    },
  //    where: {
  //      targetId: equipmentId.toString(),
  //      targetType: 'EQUIPMENT',
  //      user: {
  //        createdAt: {
  //          gte: startDate,
  //          lte: endDate,
  //        },
  //      },
  //    },
  //  });
  
  //  // Retornamos los datos con el formato requerido
  //  return genderStats.map(stat => ({
  //    gender: stat['user.gender'] as Gender,
  //    useCount: stat._count.id,
  //  }));
  //}
  
  //async getEquipmentTrends(equipmentId: number, period: Period, numberOfPeriods: number = 12) {
  //  try {
  //    const trends = [];
  //    const currentDate = new Date();

  //    for (let i = 0; i < numberOfPeriods; i++) {
  //      const date = new Date(currentDate);
        
  //      switch (period) {
  //        case Period.DAILY:
  //          date.setDate(date.getDate() - i);
  //          break;
  //        case Period.WEEKLY:
  //          date.setDate(date.getDate() - (i * 7));
  //          break;
  //        case Period.MONTHLY:
  //          date.setMonth(date.getMonth() - i);
  //          break;
  //        case Period.YEARLY:
  //          date.setFullYear(date.getFullYear() - i);
  //          break;
  //      }

  //      const stats = await this.calculateEquipmentStatistics(equipmentId, period, date);
  //      trends.push(stats);
  //    }

  //    return trends.reverse();
  //  } catch (error) {
  //    this.handleError(
  //      error,
  //      'Error calculating equipment trends',
  //      HttpStatus.INTERNAL_SERVER_ERROR
  //    );
  //  }
  //}

  //async compareEquipmentPopularity(equipmentIds: number[], period: Period, date: Date) {
  //  try {
  //    const comparisons = await Promise.all(
  //      equipmentIds.map(id => this.calculateEquipmentStatistics(id, period, date))
  //    );

  //    return comparisons.sort((a, b) => b.popularityScore - a.popularityScore);
  //  } catch (error) {
  //    this.handleError(
  //      error,
  //      'Error comparing equipment popularity',
  //      HttpStatus.INTERNAL_SERVER_ERROR
  //    );
  //  }
  //}

  //async getMostPopularEquipment(limit: number = 10, period: Period = Period.MONTHLY) {
  //  try {
  //    const currentDate = new Date();
  //    const { startDate, endDate } = this.getDateRangeByPeriod(currentDate, period);

  //    // Esta implementación dependerá de tu estructura de datos real
  //    const popularEquipment = await this.rating.groupBy({
  //      by: ['targetId'],
  //      where: {
  //        targetType: 'EQUIPMENT',
  //        createdAt: {
  //          gte: startDate,
  //          lte: endDate
  //        }
  //      },
  //      _count: {
  //        targetId: true
  //      },
  //      orderBy: {
  //        _count: {
  //          targetId: 'desc'
  //        }
  //      },
  //      take: limit
  //    });

  //    return popularEquipment.map(item => ({
  //      equipmentId: parseInt(item.targetId),
  //      useCount: item._count.targetId
  //    }));
  //  } catch (error) {
  //    this.handleError(
  //      error,
  //      'Error getting most popular equipment',
  //      HttpStatus.INTERNAL_SERVER_ERROR
  //    );
  //  }
  //}
}
