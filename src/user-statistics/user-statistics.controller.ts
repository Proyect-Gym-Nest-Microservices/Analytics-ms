import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserStatisticsService } from './user-statistics.service';
import { DatePeriodDto } from 'src/common/dto/date-period.dto';
import { MongoIdDto } from 'src/common/dto/mongo-id.dto';

@Controller()
export class UserStatisticsController {
  constructor(private readonly userStatisticsService: UserStatisticsService) {}

  @MessagePattern('generate.user.statistics')
  generateUserStatistics(
    @Payload()datePeriodDto: DatePeriodDto
  ) {
    return this.userStatisticsService.generateUserStatistics(
      datePeriodDto.period,
      new Date(datePeriodDto.date)
    );
  }

  @MessagePattern('get.user.statistics')
  getUserStatistics(
    @Payload()datePeriodDto: DatePeriodDto
  ) {
    return this.userStatisticsService.getUserStatistics(
      datePeriodDto.period,
      new Date(datePeriodDto.date)
    );
  }

  @MessagePattern('find.user.statistic.by.id')
  findUserStatsById(
    @Payload() statsIdDto: MongoIdDto
  ) {
    return this.userStatisticsService.findUserStatsById(statsIdDto.id);
  }

  @MessagePattern('delete.user.statistic.by.id')
  deleteUserStatistics(
    @Payload() statsIdDto: MongoIdDto
  ) {
    return this.userStatisticsService.deleteUserStatistics(statsIdDto.id);
  }
}