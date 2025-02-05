import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { PrismaClient } from '@prisma/client';
import { Period } from "../common/enums/analytics.enum";
import { NATS_SERVICE } from "../config/services.config";
import { firstValueFrom } from "rxjs";
import { TargetType } from "../common/enums/target-type.enum";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class ExerciseStatisticsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(ExerciseStatisticsService.name);
  private static readonly TOP_ITEMS_LIMIT = 5;

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {
    super()
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('DataBase connected - exercise');
  }

  async generateExerciseStatistics(exerciseId: number, period: Period, date: Date) {
    try {
      const { startDate, endDate } = this.getDateRangeByPeriod(date,period);

      const [existingStats, genderStats, exercise] = await Promise.all([
        this.exerciseStatistics.findFirst({
          where: {
            exerciseId,
            period,
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        }),
        this.calculateGenderStats(exerciseId, TargetType.EXERCISE),
        this.findExerciseById(exerciseId)
      ])

      const { totalRatings, level: difficulty, category, score } = exercise
      const genderStatsData = (genderStats?.length ? genderStats.map(stat => ({
        gender: stat.gender,
        useCount: stat.count
      })) : [])

      if (existingStats) {
        // Actualizar estadísticas existentes
        const updatedStats = await this.exerciseStatistics.update({
          where: { id: existingStats.id },
          data: {
            exerciseId,
            popularityScore: score,
            totalUses: totalRatings,
            genderStats: {
              deleteMany: {},
              ...(genderStatsData.length > 0 && {
                createMany: {
                  data: genderStatsData,
                },
              }),
            },
            categoryStats: {
              deleteMany: {},
              createMany: {
                data: { category, useCount: totalRatings }
              }
            },
            difficultyStats: {
              deleteMany: {},
              createMany: {
                data: { difficulty, useCount: totalRatings }
              }
            }
          },
          include: {
            genderStats: true,
            categoryStats: true,
            difficultyStats: true
          }
        });

        this.logger.log(`Statistics updated for exercise ${exerciseId}, period ${period} and date ${date}`);
        return updatedStats;
      }

      // Crear nuevas estadísticas
      const exerciseStats = await this.exerciseStatistics.create({
        data: {
          exerciseId,
          period,
          date,
          totalUses: totalRatings,
          popularityScore: score,
          ...(genderStatsData.length > 0 && {
            genderStats: {
              createMany: {
                data: genderStatsData,
              },
            },
          }),
          categoryStats: {
            createMany: {
              data: { category, useCount: totalRatings }
            }
          },
          difficultyStats: {
            createMany: {
              data: { difficulty, useCount: totalRatings }
            }
          }
        },
        include: {
          genderStats: true,
          categoryStats: true,
          difficultyStats: true
        }
      });

      return exerciseStats;

    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error generating exercise statistics'
      });
    }
  }

  async findExerciseStatsById(statisticsId: string) {
    try {
      const statistic = await this.exerciseStatistics.findUnique({
        where: { id: statisticsId },
        include: { 
          genderStats: true,
          categoryStats: true,
          difficultyStats: true
        },
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
        `Error retrieving exercise statistics with ID ${statisticsId}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findAllExerciseStats(paginationDto: PaginationDto) {
    const { limit=10, page=1 } = paginationDto
    try {
      const totalStats = await this.exerciseStatistics.count();
      const lastPage = Math.ceil(totalStats / limit)
      return {
        data:await this.exerciseStatistics.findMany({
          skip: (page - 1) * limit,
          take:limit,
          include: {
            genderStats: true,
            categoryStats: true,
            difficultyStats: true
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
      console.log(error)
      this.handleError(
        error,
        'Error retrieving all exercise statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getExerciseStatistics(period: Period, date: Date) {
    try {
      const { startDate, endDate } = this.getDateRangeByPeriod(date, period);

      const [popularExercises, topRated, categoryStats, difficultyStats] = await Promise.all([
        this.findMostPopularExercises(startDate, endDate),
        this.findTopRatedExercises(startDate, endDate),
        this.getCategoryStatistics(startDate, endDate),
        this.getDifficultyStatistics(startDate, endDate)
      ]);

      if (!popularExercises.length && !topRated.length) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'No data found for the specified period.',
        });
      }

      return {
        popularExercises,
        topRated,
        categoryStats,
        difficultyStats
      };
    } catch (error) {
      this.handleError(
        error,
        'Error retrieving exercise statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async deleteExerciseStatistics(statisticsId: string) {
    try {
      const existingStats = await this.findExerciseStatsById(statisticsId);

      await this.exerciseStatistics.update({
        where: { id: existingStats.id },
        data: {
          genderStats: {
            deleteMany: {}
          },
          categoryStats: {
            deleteMany: {}
          },
          difficultyStats: {
            deleteMany: {}
          }
        }
      });

      const deletedStats = await this.exerciseStatistics.delete({
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
        `Error deleting exercise statistics with ID ${statisticsId}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
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


  private async findExerciseById(exerciseId: number) {
    try {
      return await firstValueFrom(
        this.client.send('find.exercise.by.id', { id: exerciseId })
      )
    } catch (error) {
      this.logger.error('Error finding equipment', error);
      throw error;
    }
  }

  private async findMostPopularExercises(startDate: Date, endDate: Date) {
    return this.exerciseStatistics.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { totalUses: 'desc' },
      include: { 
        genderStats: true,
      },
      take: ExerciseStatisticsService.TOP_ITEMS_LIMIT,
    });
  }

  private async findTopRatedExercises(startDate: Date, endDate: Date) {
    return this.exerciseStatistics.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { popularityScore: 'desc' },
      include: { 
        genderStats: true,
      },
      take: ExerciseStatisticsService.TOP_ITEMS_LIMIT,
    });
  }

  private async getCategoryStatistics(startDate: Date, endDate: Date) {
    const categoryStats = await this.exerciseCategoryStats.groupBy({
      by: ['category'],
      where: {
        exerciseStat: {
          date: {
            gte: startDate,
            lte: endDate
          }
        },
      },
      _sum: {
        useCount: true
      },
      orderBy: {
        _sum: { useCount: 'desc' }
      }
    });
    return categoryStats.map(stat => ({
      category: stat.category,
      totalUse:stat._sum.useCount
    }));
  }

  private async getDifficultyStatistics(startDate: Date, endDate: Date) {
    const difficultyStats = await this.exerciseDifficultyStats.groupBy({
      by: ['difficulty'],
      where: {
        exerciseStat: {
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      },
      _sum: {
        useCount: true
      },
      orderBy: {
        _sum: {
          useCount: 'desc' 
        }
      } 
    });

    return difficultyStats.map(stat => ({
      difficulty: stat.difficulty,
      totalUse:stat._sum.useCount
    }));
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
}