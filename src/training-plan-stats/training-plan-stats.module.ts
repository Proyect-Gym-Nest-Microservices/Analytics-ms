import { Module } from '@nestjs/common';
import { TrainingPlanStatsService } from './training-plan-stats.service';
import { TrainingPlanStatsController } from './training-plan-stats.controller';

@Module({
  controllers: [TrainingPlanStatsController],
  providers: [TrainingPlanStatsService],
})
export class TrainingPlanStatsModule {}
