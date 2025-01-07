import { Module } from '@nestjs/common';
import { WorkoutStatisticsService } from './workout-statistics.service';
import { WorkoutStatisticsController } from './workout-statistics.controller';
import { NatsModule } from 'src/transports/nats.module';

@Module({
  controllers: [WorkoutStatisticsController],
  providers: [WorkoutStatisticsService],
  imports:[NatsModule]
})
export class WorkoutStatisticsModule {}
