import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UpdateExerciseStatisticDto } from './dto/update-exercise-statistic.dto';
import { PrismaClient } from '@prisma/client';
import { ExerciseStatisticsDto } from './dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Period } from 'src/common/enums/period.enum';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { firstValueFrom } from 'rxjs';
import { NATS_SERVICE } from 'src/config';

@Injectable()
export class ExerciseStatisticsService extends PrismaClient implements OnModuleInit {
    private readonly logger = new Logger('Exercise-Statistics-Service');

    constructor(
        @Inject(NATS_SERVICE) private readonly client:ClientProxy
    ) {
        super()
    }

    async onModuleInit() {
      await this.$connect();
      this.logger.log('Database connected');
    }
  
    async createExerciseStats(createStatsDto: ExerciseStatisticsDto) {
      try {
        await this.validateExercise(createStatsDto.exerciseId);
  
        const exerciseStats = await this.exerciseStatistics.create({
          data: {
            period: createStatsDto.period,
            date: createStatsDto.date,
            exerciseId: createStatsDto.exerciseId,
            totalUses: createStatsDto.totalUses,
            popularityScore: createStatsDto.popularityScore,
            averageWeight: createStatsDto.averageWeight,
            averageReps: createStatsDto.averageReps,
            genderStats: {
              create: createStatsDto.genderStats.map(stat => ({
                gender: stat.gender,
                useCount: stat.useCount,
                averageWeight: stat.averageWeight,
                averageReps: stat.averageReps
              }))
            }
          },
          include: {
            genderStats: true
          }
        });

        return exerciseStats;
      } catch (error) {
        if (error instanceof RpcException) throw error;
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error'
        });
      }
    }
  
    async findStatsByExerciseId(exerciseId: number, period: Period) {
      try {
        const stats = await this.exerciseStatistics.findFirst({
          where: { 
            exerciseId,
            period 
          },
          include: {
            genderStats: true
          },
          orderBy: {
            date: 'desc'
          }
        });
  
        if (!stats) {
          throw new RpcException({
            status: HttpStatus.NOT_FOUND,
            message: 'Statistics not found for this exercise'
          });
        }
  
        return stats;
      } catch (error) {
        if (error instanceof RpcException) throw error;
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error'
        });
      }
    }
  
    async findStatsByPeriod(period: Period, paginationDto: PaginationDto) {
      try {
        const { limit, page } = paginationDto;
        const totalStats = await this.exerciseStatistics.count({
          where: { period }
        });
        const lastPage = Math.ceil(totalStats / limit);
  
        const stats = await this.exerciseStatistics.findMany({
          where: { period },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            genderStats: true
          },
          orderBy: {
            date: 'desc'
          }
        });
  
        return {
          data: stats,
          meta: {
            totalStats,
            page,
            lastPage
          }
        };
      } catch (error) {
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error'
        });
      }
    }
  
    async updateExerciseStats(exerciseId: number, period: Period, updateStatsDto: ExerciseStatisticsDto) {
      try {
        const existingStats = await this.findStatsByExerciseId(exerciseId, period);
  
        const updatedStats = await this.exerciseStatistics.update({
          where: {
            id: existingStats.id
          },
          data: {
            totalUses: updateStatsDto.totalUses,
            popularityScore: updateStatsDto.popularityScore,
            averageWeight: updateStatsDto.averageWeight,
            averageReps: updateStatsDto.averageReps,
            date: updateStatsDto.date,
            genderStats: {
              deleteMany: {},
              create: updateStatsDto.genderStats.map(stat => ({
                gender: stat.gender,
                useCount: stat.useCount,
                averageWeight: stat.averageWeight,
                averageReps: stat.averageReps
              }))
            }
          },
          include: {
            genderStats: true
          }
        });
  
        return updatedStats;
      } catch (error) {
        if (error instanceof RpcException) throw error;
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error'
        });
      }
    }
  
    private async validateExercise(exerciseId: number): Promise<void> {
      const exercise = await firstValueFrom(
          this.client.send('find.exercise.by.id',{id:exerciseId})
      )
  
      if (!exercise) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Exercise not found'
        });
      }
    }
}
