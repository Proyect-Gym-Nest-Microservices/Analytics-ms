import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { PrismaClient } from '@prisma/client';
import { Period } from "src/common/enums/analytics.enum";
import { NATS_SERVICE } from "src/config";
import { firstValueFrom } from "rxjs";
import { TargetType } from "src/common/enums/target-type.enum";
import { PaginationDto } from "src/common/dto/pagination.dto";

@Injectable()
export class TrainingPlanStatsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(TrainingPlanStatsService.name);
  private static readonly TOP_ITEMS_LIMIT = 5;

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('DataBase connected - training plan stats');
  }

  async generateTrainingPlanStatistics(trainingPlanId: number, period: Period, date: Date) {
    try {
      const { startDate, endDate } = this.getDateRangeByPeriod(date, period);
      const [existingStats, genderStats, trainingPlan] = await Promise.all([
        this.trainingPlanStatistics.findFirst({
          where: {
            trainingPlanId,
            period,
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        }),
        this.calculateGenderStats(trainingPlanId, TargetType.TRAINING),
        this.findTrainingPlanById(trainingPlanId)
      ]);
      
      const { totalRatings:totalCompletions, level:difficulty } = trainingPlan;
      const genderStatsData = (genderStats?.length ? genderStats.map(stat => ({
        gender: stat.gender,
        completionCount: stat.count
      })) : []);
      
      if (existingStats) {
        const updatedStats = await this.trainingPlanStatistics.update({
          where: { id: existingStats.id },
          data: {
            trainingPlanId,
            totalCompletions,
            genderStats: {
              deleteMany: {},
              ...(genderStatsData.length > 0 && {
                createMany: {
                  data: genderStatsData,
                },
              }),
            },
            difficultyStats: {
              deleteMany: {},
              createMany: {
                data: { difficulty, completionCount: totalCompletions }
              }
            }
          },
          include: {
            genderStats: true,
            difficultyStats: true
          }
        });

        this.logger.log(`Statistics updated for training plan ${trainingPlanId}, period ${period} and date ${date}`);
        return updatedStats;
      }

      const trainingPlanStats = await this.trainingPlanStatistics.create({
        data: {
          trainingPlanId,
          period,
          date,
          totalCompletions,
          ...(genderStatsData.length > 0 && {
            genderStats: {
              createMany: {
                data: genderStatsData,
              },
            },
          }),
          difficultyStats: {
            createMany: {
              data: { difficulty, completionCount: totalCompletions }
            }
          }
        },
        include: {
          genderStats: true,
          difficultyStats: true
        }
      });

      return trainingPlanStats;

    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error generating training plan statistics'
      });
    }
  }


    async findAllTrainingPlanStats(paginationDto: PaginationDto) {
      const { limit=10, page=1 } = paginationDto
      try {
        const totalStats = await this.trainingPlanStatistics.count();
        const lastPage = Math.ceil(totalStats / limit)
        return {
          data:await this.trainingPlanStatistics.findMany({
            skip: (page - 1) * limit,
            take:limit,
            include: {
              genderStats: true,
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

  async findTrainingPlanStatsById(statisticsId: string) {
    try {
      const statistic = await this.trainingPlanStatistics.findUnique({
        where: { id: statisticsId },
        include: { 
          genderStats: true,
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
        `Error retrieving training plan statistics with ID ${statisticsId}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getTrainingPlanStatistics(period: Period, date: Date) {
    try {
      const { startDate, endDate } = this.getDateRangeByPeriod(date, period);

      const [popularTrainingPlans, difficultyStats] = await Promise.all([
        this.findMostPopularTrainingPlans(startDate, endDate),
        this.getDifficultyStatistics(startDate, endDate)
      ]);

      if (!popularTrainingPlans.length) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'No data found for the specified period.',
        });
      }

      return {
        popularTrainingPlans,
        difficultyStats
      };
    } catch (error) {
      this.handleError(
        error,
        'Error retrieving training plan statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async deleteTrainingPlanStatistics(statisticsId: string) {
    try {
      const existingStats = await this.findTrainingPlanStatsById(statisticsId);

      await this.trainingPlanStatistics.update({
        where: { id: existingStats.id },
        data: {
          genderStats: {
            deleteMany: {}
          },
          difficultyStats: {
            deleteMany: {}
          }
        }
      });

      const deletedStats = await this.trainingPlanStatistics.delete({
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
        `Error deleting training plan statistics with ID ${statisticsId}`,
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
      );
    } catch (error) {
      this.logger.error('Error getting training plan gender statistics', error);
      throw error;
    }
  }

  private async findTrainingPlanById(trainingPlanId: number) {
    try {
      return await firstValueFrom(
        this.client.send('find.training.plan.by.id', { id: trainingPlanId })
      );
    } catch (error) {
      this.logger.error('Error finding training plan', error);
      throw error;
    }
  } 

  private async findMostPopularTrainingPlans(startDate: Date, endDate: Date) {
    return this.trainingPlanStatistics.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { totalCompletions: 'desc' },
      include: { 
        genderStats: true,
      },
      take: TrainingPlanStatsService.TOP_ITEMS_LIMIT,
    });
  }

  private async getDifficultyStatistics(startDate: Date, endDate: Date) {
    const difficultyStats = await this.trainingPlanDifficultyStats.groupBy({
      by: ['difficulty'],
      where: {
        trainingPlanStat: {
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      },
      _sum: {
        completionCount: true
      },
      orderBy: {
        _sum: {
          completionCount: 'desc' 
        }
      } 
    });

    return difficultyStats.map(stat => ({
      difficulty: stat.difficulty,
      completionCount: stat._sum.completionCount
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