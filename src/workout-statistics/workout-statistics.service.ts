import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { PrismaClient } from '@prisma/client';
import { Period } from "../common/enums/analytics.enum";
import { NATS_SERVICE } from "../config/services.config";
import { firstValueFrom } from "rxjs";
import { TargetType } from "../common/enums/target-type.enum";
import { PaginationDto } from "../common/dto/pagination.dto";

@Injectable()
export class WorkoutStatisticsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(WorkoutStatisticsService.name);
  private static readonly TOP_ITEMS_LIMIT = 5;

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {
    super()
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('DataBase connected - workout');
  }

  async generateWorkoutStatistics(workoutId: number, period: Period, date: Date) {
    try {
      const { startDate, endDate } = this.getDateRangeByPeriod(date, period);
      const [existingStats, genderStats, workout] = await Promise.all([
        this.workoutStatistics.findFirst({
          where: {
            workoutId,
            period,
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        }),
        this.calculateGenderStats(workoutId, TargetType.WORKOUT),
        this.findWorkoutById(workoutId)
      ]);

      const { totalRatings, level: difficulty, category, score } = workout;
      const genderStatsData = (genderStats?.length ? genderStats.map(stat => ({
        gender: stat.gender,
        useCount: stat.count
      })) : []);

      if (existingStats) {
        const updatedStats = await this.workoutStatistics.update({
          where: { id: existingStats.id },
          data: {
            workoutId,
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

        this.logger.log(`Statistics updated for workout ${workoutId}, period ${period} and date ${date}`);
        return updatedStats;
      }
      const workoutStats = await this.workoutStatistics.create({
        data: {
          workoutId,
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

      return workoutStats;

    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error generating workout statistics'
      });
    }
  }

  async findAllWorkoutStats(paginationDto: PaginationDto) {
    const { limit = 10, page = 1 } = paginationDto
    try {
      const totalStats = await this.workoutStatistics.count();
      const lastPage = Math.ceil(totalStats / limit)
      return {
        data: await this.workoutStatistics.findMany({
          skip: (page - 1) * limit,
          take: limit,
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

  async findWorkoutStatsById(statisticsId: string) {
    try {
      const statistic = await this.workoutStatistics.findUnique({
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
        `Error retrieving workout statistics with ID ${statisticsId}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getWorkoutStatistics(period: Period, date: Date) {
    try {
      const { startDate, endDate } = this.getDateRangeByPeriod(date, period);

      const [popularWorkouts, topRated, categoryStats, difficultyStats] = await Promise.all([
        this.findMostPopularWorkouts(startDate, endDate),
        this.findTopRatedWorkouts(startDate, endDate),
        this.getCategoryStatistics(startDate, endDate),
        this.getDifficultyStatistics(startDate, endDate)
      ]);

      if (!popularWorkouts.length && !topRated.length) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'No data found for the specified period.',
        });
      }

      return {
        popularWorkouts,
        topRated,
        categoryStats,
        difficultyStats
      };
    } catch (error) {
      this.handleError(
        error,
        'Error retrieving workout statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async deleteWorkoutStatistics(statisticsId: string) {
    try {
      const existingStats = await this.findWorkoutStatsById(statisticsId);

      await this.workoutStatistics.update({
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

      const deletedStats = await this.workoutStatistics.delete({
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
        `Error deleting workout statistics with ID ${statisticsId}`,
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
      this.logger.error('Error getting workout gender statistics', error);
      throw error;
    }
  }

  private async findWorkoutById(workoutId: number) {
    try {
      return await firstValueFrom(
        this.client.send('find.one.workout', { id: workoutId })
      )
    } catch (error) {
      this.logger.error('Error finding workout', error);
      throw error;
    }
  }

  private async findMostPopularWorkouts(startDate: Date, endDate: Date) {
    return this.workoutStatistics.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { totalUses: 'desc' },
      include: {
        genderStats: true,
      },
      take: WorkoutStatisticsService.TOP_ITEMS_LIMIT,
    });
  }

  private async findTopRatedWorkouts(startDate: Date, endDate: Date) {
    return this.workoutStatistics.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { popularityScore: 'desc' },
      include: {
        genderStats: true,
      },
      take: WorkoutStatisticsService.TOP_ITEMS_LIMIT,
    });
  }

  private async getCategoryStatistics(startDate: Date, endDate: Date) {
    const categoryStats = await this.workoutCategoryStats.groupBy({
      by: ['category'],
      where: {
        workoutStat: {
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
      useCount: stat._sum.useCount
    }));
  }

  private async getDifficultyStatistics(startDate: Date, endDate: Date) {
    const difficultyStats = await this.workoutDifficultyStats.groupBy({
      by: ['difficulty'],
      where: {
        workoutStat: {
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
      useCount: stat._sum.useCount
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