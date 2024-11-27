import { Module } from '@nestjs/common';
import { UserStatisticsModule } from './user-statistics/user-statistics.module';
import { ExerciseStatisticsModule } from './exercise-statistics/exercise-statistics.module';
import { WorkoutStatisticsModule } from './workout-statistics/workout-statistics.module';
import { TrainingPlanStatsModule } from './training-plan-stats/training-plan-stats.module';
import { EquipmentStatsModule } from './equipment-stats/equipment-stats.module';
import { NatsModule } from './transports/nats.module';


@Module({
  imports: [NatsModule, UserStatisticsModule, ExerciseStatisticsModule, WorkoutStatisticsModule, TrainingPlanStatsModule, EquipmentStatsModule],

})
export class AppModule {}
