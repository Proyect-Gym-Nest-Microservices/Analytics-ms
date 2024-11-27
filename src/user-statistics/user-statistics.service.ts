import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { PrismaClient } from "@prisma/client";
import { Period } from "src/common/enums/period.enum";
import { NATS_SERVICE } from "src/config";
import { UserStatisticsDto } from "./dto";
import { AgeRange } from "./enums/user-stats.enum";
import { firstValueFrom } from "rxjs";

@Injectable()
export class UserStatisticsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('User-Statistics-Service');

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {
    super()
  }
  async onModuleInit() {
    await this.$connect();
    this.logger.log('DataBase connected');
  }

  async generateUserStatistics(period: Period, date: Date) {
    try {
      // Obtener fecha inicio y fin según el período
      const { startDate, endDate } = this.getDateRange(period, date);

      // Calcular estadísticas básicas
      const totalUsers = await this.calculateTotalUsers();
      const newUsers = await this.calculateNewUsers(startDate, endDate);
      const { activeUsers, inactiveUsers } = await this.calculateUserActivity(startDate, endDate);

      // Calcular estadísticas por género
      const genderStats = await this.calculateGenderStats();

      // Calcular estadísticas por objetivo
      const goalStats = await this.calculateGoalStats();

      // Calcular estadísticas por rango de edad
      const ageRangeStats = await this.calculateAgeRangeStats();


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
          }
        }
      });

      return userStats;

    } catch (error) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error generating user statistics'
      });
    }
  }

  async getStatistics(period: Period, date: Date) {
    try {
      const { startDate, endDate } = this.getDateRange(period, date);

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
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error retrieving user statistics'
      });
    }
  }

  private async calculateTotalUsers(): Promise<number> {
    try {
      return await firstValueFrom(
        this.client.send('calculate.total.users', {})
      )

    } catch (error) {
      this.logger.error('Error getting total users', error);
      throw error;
    }
  }

  private async calculateNewUsers(startDate: Date, endDate: Date): Promise<number> {
    try {
      return await firstValueFrom(
        this.client.send('calculate.new.users', { startDate, endDate })
      );
    } catch (error) {
      this.logger.error('Error getting new users', error);
      throw error;
    }
  }

  private async calculateUserActivity(startDate: Date, endDate: Date): Promise<{ activeUsers: number, inactiveUsers: number }> {
    try {
      return await firstValueFrom(
        this.client.send('calculate.user.activity', { startDate, endDate })
      );
    } catch (error) {
      this.logger.error('Error getting user activity', error);
      throw error;
    }
  }

  private async calculateGenderStats() {
    try {
      return await firstValueFrom(
        this.client.send('calculate.gender.stats', {})
      );
    } catch (error) {
      this.logger.error('Error getting gender stats', error);
      throw error;
    }
  }

  private async calculateGoalStats() {
    try {
      return await firstValueFrom(
        this.client.send('calculate.goal.stats', {})
      );
    } catch (error) {
      this.logger.error('Error getting goal stats', error);
      throw error;
    }
  }

  private async calculateAgeRangeStats() {
    try {
      const users =  await firstValueFrom(
        this.client.send('get.active.users.with.age', {})
      );
      const ageRangeCounts = new Map<AgeRange, number>();
      users.forEach(user => {
        const age = this.calculateAge(user.birthDate);
        const ageRange = this.determineAgeRange(age);
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



  private getDateRange(period: Period, date: Date): { startDate: Date, endDate: Date } {
    const startDate = new Date(date);
    const endDate = new Date(date);

    switch (period) {
      case Period.DAILY:
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case Period.WEEKLY:
        startDate.setDate(date.getDate() - date.getDay());
        endDate.setDate(startDate.getDate() + 6);
        break;
      case Period.MONTHLY:
        startDate.setDate(1);
        endDate.setMonth(startDate.getMonth() + 1);
        endDate.setDate(0);
        break;
      case Period.YEARLY:
        startDate.setMonth(0, 1);
        endDate.setMonth(11, 31);
        break;
    }

    return { startDate, endDate };
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  private determineAgeRange(age: number): AgeRange {
    // Implementar lógica según tus rangos de edad definidos
    if (age < 18) return AgeRange.UNDER_18;
    if (age < 25) return AgeRange.AGE_18_24;
    if (age < 35) return AgeRange.AGE_25_34;
    if (age < 45) return AgeRange.AGE_35_44;
    if (age < 55) return AgeRange.AGE_45_54;
    return AgeRange.AGE_55_PLUS;
  }
}