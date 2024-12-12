import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UpdateExerciseStatisticDto } from './dto/update-exercise-statistic.dto';
import { PrismaClient } from '@prisma/client';
import { ExerciseStatisticsDto } from './dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Period } from 'src/common/enums/analytics.enum';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { firstValueFrom } from 'rxjs';
import { NATS_SERVICE } from 'src/config';

@Injectable()
export class ExerciseStatisticsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('Exercise-Statistics-Service');

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('DataBase connected');
  }

  async createExerciseStatistics(exerciseStatisticsDto: ExerciseStatisticsDto) {
    try {

      // Obtener popularityScore del microservicio
      const exercise = await this.findExercisebyId(exerciseStatisticsDto.exerciseId);

      // Crear estadísticas
      const statisticsData = await this.exerciseStatistics.create({
        data: {
          exerciseId: exerciseStatisticsDto.exerciseId,
          period: exerciseStatisticsDto.period,
          date: exerciseStatisticsDto.date,
          totalUses: exerciseStatisticsDto.totalUses,
          //popularityScore: exercise.popularityScore,
          genderStats: {
            createMany: {
              data: exerciseStatisticsDto.genderStats.map(stat => ({
                gender: stat.gender,
                useCount: stat.useCount
              }))
            }
          },
          categoryStats: {
            createMany: {
              data: exerciseStatisticsDto.categoryStats.map(stat => ({
                category: stat.category,
                useCount: stat.useCount
              }))
            }
          },
          dificultyStats: {
            createMany: {
              data: exerciseStatisticsDto.dificultyStats.map(stat => ({
                difficulty: stat.difficulty,
                useCount: stat.useCount
              }))
            }
          }
        },
        include: {
          genderStats: true,
          categoryStats: true,
          dificultyStats: true
        }
      });

      return statisticsData;

    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error'
      });
    }
  }



  private async findExercisebyId(exerciseId: number): Promise<number> {
    try {
      return await firstValueFrom(
        this.client.send('find.exercise.by.id', { id:exerciseId })
      );
    } catch (error) {
      throw new RpcException(error)
    }
  }
}