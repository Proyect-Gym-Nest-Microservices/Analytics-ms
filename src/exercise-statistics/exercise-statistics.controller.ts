import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ExerciseStatisticsService } from './exercise-statistics.service';
import { DatePeriodDto } from '../common/dto/date-period.dto';
import { MongoIdDto } from '../common/dto/mongo-id.dto';
import { ExerciseStatisticsDto } from './dto/exercise-statistics-dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller()
export class ExerciseStatisticsController {
  constructor(private readonly exerciseStatsService: ExerciseStatisticsService) {}

  @MessagePattern('generate.exercise.statistics')
  generateExerciseStatistics(
    @Payload() exerciseStatsDto: ExerciseStatisticsDto
  ) {
    return this.exerciseStatsService.generateExerciseStatistics(
      exerciseStatsDto.exerciseId,
      exerciseStatsDto.period,
      new Date(exerciseStatsDto.date)
    );
  }

  @MessagePattern('get.exercise.statistics')
  getExerciseStatistics(
    @Payload() datePeriodDto: DatePeriodDto
  ) {
    return this.exerciseStatsService.getExerciseStatistics(
      datePeriodDto.period,
      new Date(datePeriodDto.date)
    );
  }

  @MessagePattern('find.exercise.statistic.by.id')
  findExerciseStatsById(
    @Payload() statsIdDto: MongoIdDto
  ) {
    return this.exerciseStatsService.findExerciseStatsById(statsIdDto.id);
  }

  @MessagePattern('find.all.exercise.stats')
  findAllExerciseStats(@Payload() paginationDto: PaginationDto) {
    return this.exerciseStatsService.findAllExerciseStats(paginationDto);
  }

  @MessagePattern('delete.exercise.statistic.by.id')
  deleteExerciseStatistics(
    @Payload() statsIdDto: MongoIdDto
  ) {
    return this.exerciseStatsService.deleteExerciseStatistics(statsIdDto.id);
  }
}