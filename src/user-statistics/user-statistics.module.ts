import { Module } from '@nestjs/common';
import { UserStatisticsService } from './user-statistics.service';
import { UserStatisticsController } from './user-statistics.controller';

@Module({
  controllers: [UserStatisticsController],
  providers: [UserStatisticsService],
})
export class UserStatisticsModule {}
