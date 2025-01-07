import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WorkoutStatisticsService } from './workout-statistics.service';
import { DatePeriodDto } from 'src/common/dto/date-period.dto';
import { MongoIdDto } from 'src/common/dto/mongo-id.dto';
import { WorkoutStatisticsDto } from './dto/workout-statistics.dto';

@Controller()
export class WorkoutStatisticsController {
  constructor(private readonly workoutStatsService: WorkoutStatisticsService) {}

  @MessagePattern('generate.workout.statistics')
  generateWorkoutStatistics(
    @Payload() workoutStatsDto: WorkoutStatisticsDto
  ) {
    return this.workoutStatsService.generateWorkoutStatistics(
      workoutStatsDto.workoutId,
      workoutStatsDto.period,
      new Date(workoutStatsDto.date)
    );
  }

  @MessagePattern('get.workout.statistics')
  getWorkoutStatistics(
    @Payload() datePeriodDto: DatePeriodDto
  ) {
    return this.workoutStatsService.getWorkoutStatistics(
      datePeriodDto.period,
      new Date(datePeriodDto.date)
    );
  }

  @MessagePattern('find.workout.statistic.by.id')
  findWorkoutStatsById(
    @Payload() statsIdDto: MongoIdDto
  ) {
    return this.workoutStatsService.findWorkoutStatsById(statsIdDto.id);
  }

  @MessagePattern('delete.workout.statistic.by.id')
  deleteWorkoutStatistics(
    @Payload() statsIdDto: MongoIdDto
  ) {
    return this.workoutStatsService.deleteWorkoutStatistics(statsIdDto.id);
  }
}