import { Module } from '@nestjs/common';
import { TrainingPlanStatsService } from './training-plan-stats.service';
import { TrainingPlanStatsController } from './training-plan-stats.controller';
import { NatsModule } from 'src/transports/nats.module';

@Module({
  controllers: [TrainingPlanStatsController],
  providers: [TrainingPlanStatsService],
  imports:[NatsModule]
})
export class TrainingPlanStatsModule {}
