import { Module } from '@nestjs/common';
import { ExerciseStatisticsService } from './exercise-statistics.service';
import { ExerciseStatisticsController } from './exercise-statistics.controller';

@Module({
  controllers: [ExerciseStatisticsController],
  providers: [ExerciseStatisticsService],
})
export class ExerciseStatisticsModule {}
