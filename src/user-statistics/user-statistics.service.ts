import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { PrismaClient } from "@prisma/client";
import { Period } from "src/common/enums/analytics.enum";
import { NATS_SERVICE } from "src/config";
import { AgeRange } from "./enums/user-stats.enum";
import { firstValueFrom } from "rxjs";
import { PaginationDto } from "src/common/dto/pagination.dto";

@Injectable()
export class UserStatisticsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(UserStatisticsService.name);

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

  async generateUserStatistics(period: Period, date: Date) {
    try {
      const { startDate, endDate } = this.getDateRangeByPerdiod(period, date);

      const existingStats = await this.userStatistics.findFirst({
        where: {
          period,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const data = await this.calculateUserStatistics(startDate, endDate);

      const {
        totalUsers,
        newUsers,
        userActivity: {
          activeUsers,
          inactiveUsers,
        },
        genderStats,
        goalStats,
        ageRange
      } = data

      const ageRangeStats = await this.calculateAgeRangeStats(ageRange)

      if (existingStats) {
        const updatedStats = await this.userStatistics.update({
          where: { id: existingStats.id },
          data: {
            totalUsers,
            newUsers,
            activeUsers,
            inactiveUsers,
            genderStats: {
              deleteMany: {},
              createMany: { data: genderStats }
            },
            goalStats: {
              deleteMany: {},
              createMany: { data: goalStats }
            },
            ageRangeStats: {
              deleteMany: {},
              createMany: { data: ageRangeStats }
            }
          },
          include: {
            genderStats: true,
            goalStats: true,
            ageRangeStats: true
          }
        });

        this.logger.log(`Statistics updated for period ${period} and date ${date}`);
        return updatedStats;
      }
      const userStats = await this.userStatistics.create({
        data: {
          period: period,
          date: date,
          totalUsers: totalUsers,
          newUsers: newUsers,
          activeUsers: activeUsers,
          inactiveUsers: inactiveUsers,
          genderStats: {
            createMany: {
              data: genderStats
            }
          },
          goalStats: {
            createMany: {
              data: goalStats
            }
          },
          ageRangeStats: {
            createMany: {
              data: ageRangeStats
            }
          },
        },
        include: { genderStats: true, goalStats: true, ageRangeStats: true }
      });

      return userStats;

    } catch (error) {
      this.handleError(
        error,
        'Error generating user statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUserStatistics(period: Period, date: Date) {
    try {
      const { startDate, endDate } = this.getDateRangeByPerdiod(period, date);

      const statistics = await this.userStatistics.findFirst({
        where: {
          period,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          genderStats: true,
          goalStats: true,
          ageRangeStats: true
        }
      });

      if (!statistics) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Statistics not found for the specified period'
        });
      }

      return statistics;

    } catch (error) {
      this.handleError(
        error,
        'Error retrieving user statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findAllUserStats(paginationDto: PaginationDto) {
    const { limit = 10, page = 1 } = paginationDto
    try {
      const totalStats = await this.userStatistics.count();
      const lastPage = Math.ceil(totalStats / limit)
      return {
        data: await this.userStatistics.findMany({
          skip: (page - 1) * limit,
          take: limit,
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
      console.log(error)
      this.handleError(
        error,
        'Error retrieving all exercise statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findUserStatsById(statisticsId: string) {
    try {
      const statistic = await this.userStatistics.findUnique({
        where: { id: statisticsId },
        include: {
          genderStats: true,
          goalStats: true,
          ageRangeStats: true
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
        `Error retrieving user statistics with ID ${statisticsId}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async deleteUserStatistics(statisticsId: string) {
    try {
      const existingStats = await this.findUserStatsById(statisticsId);

      await this.userStatistics.update({
        where: { id: existingStats.id },
        data: {
          genderStats: {
            deleteMany: {}
          },
          goalStats: {
            deleteMany: {}
          },
          ageRangeStats: {
            deleteMany: {}
          }
        }
      });

      const deletedStats = await this.userStatistics.delete({
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
        `Error deleting user statistics with ID ${statisticsId}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async calculateUserStatistics(startDate: Date, endDate: Date) {
    try {
      return await firstValueFrom(
        this.client.send('calculate.user.stats', { startDate, endDate })
      )

    } catch (error) {
      this.logger.error('Error getting statistics users', error);
      throw error;
    }
  }

  private async calculateAgeRangeStats(users: { age: number }[]) {
    try {

      const ageRangeCounts = new Map<AgeRange, number>();
      users.forEach(user => {
        const ageRange = this.determineAgeRange(user.age);
        ageRangeCounts.set(ageRange, (ageRangeCounts.get(ageRange) || 0) + 1);
      });

      return Array.from(ageRangeCounts.entries()).map(([ageRange, count]) => ({
        ageRange,
        count
      }));
    } catch (error) {
      this.logger.error('Error getting age range stats', error);
      throw error;
    }
  }


  private getDateRangeByPerdiod(period: Period, date: Date): { startDate: Date, endDate: Date } {
    const startDate = new Date(date);
    const endDate = new Date(date);
    try {
      switch (period) {
        case Period.DAILY: // 00:00 - 23:59 
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case Period.WEEKLY: // Lunes - Domingo
          startDate.setDate(date.getDate() - ((date.getDay() + 6) % 7));
          endDate.setDate(startDate.getDate() + 6);
          break;
        case Period.MONTHLY: // Mes
          startDate.setDate(1);
          endDate.setMonth(startDate.getMonth() + 1);
          endDate.setDate(0);
          break;
        case Period.YEARLY: // Anio - 1 Enero al 31 de diciembre
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


  private determineAgeRange(age: number): AgeRange {
    if (age < 18) return AgeRange.UNDER_18;
    if (age < 25) return AgeRange.AGE_18_24;
    if (age < 35) return AgeRange.AGE_25_34;
    if (age < 45) return AgeRange.AGE_35_44;
    if (age < 55) return AgeRange.AGE_45_54;
    return AgeRange.AGE_55_PLUS;
  }
}