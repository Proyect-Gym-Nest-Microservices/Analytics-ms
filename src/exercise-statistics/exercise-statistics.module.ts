import { Module } from '@nestjs/common';
import { ExerciseStatisticsService } from './exercise-statistics.service';
import { ExerciseStatisticsController } from './exercise-statistics.controller';
import { NatsModule } from 'src/transports/nats.module';

@Module({
  controllers: [ExerciseStatisticsController],
  providers: [ExerciseStatisticsService],
  imports:[NatsModule]
})
export class ExerciseStatisticsModule {}
