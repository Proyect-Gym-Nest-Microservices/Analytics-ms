import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserStatisticsService } from './user-statistics.service';
import { Period } from 'src/common/enums/period.enum';

@Controller()
export class UserStatisticsController {
  constructor(private readonly userStatisticsService: UserStatisticsService) {}

  @MessagePattern('generate.user.statistics')
  generateUserStatistics(
    @Payload() payload: { period: Period; date: Date }
  ) {
    return this.userStatisticsService.generateUserStatistics(
      payload.period,
      payload.date
    );
  }

  @MessagePattern('get.statistics')
  getStatistics(
    @Payload() payload: { period: Period; date: Date }
  ) {
    return this.userStatisticsService.getStatistics(
      payload.period,
      payload.date
    );
  }
}