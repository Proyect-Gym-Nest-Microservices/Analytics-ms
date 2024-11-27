import { Module } from '@nestjs/common';
import { WorkoutStatisticsService } from './workout-statistics.service';
import { WorkoutStatisticsController } from './workout-statistics.controller';

@Module({
  controllers: [WorkoutStatisticsController],
  providers: [WorkoutStatisticsService],
})
export class WorkoutStatisticsModule {}
