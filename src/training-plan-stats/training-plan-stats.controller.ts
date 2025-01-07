import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TrainingPlanStatsService } from './training-plan-stats.service';
import { DatePeriodDto } from 'src/common/dto/date-period.dto';
import { MongoIdDto } from 'src/common/dto/mongo-id.dto';
import { TrainingPlanStatisticsDto } from './dto/trainingplan-statistics.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller()
export class TrainingPlanStatsController {
  constructor(private readonly trainingPlanStatsService: TrainingPlanStatsService) {}

  @MessagePattern('generate.training.plan.statistics')
  generateTrainingPlanStatistics(
    @Payload() trainingPlanStatsDto: TrainingPlanStatisticsDto
  ) {
    return this.trainingPlanStatsService.generateTrainingPlanStatistics(
      trainingPlanStatsDto.trainingPlanId,
      trainingPlanStatsDto.period,
      new Date(trainingPlanStatsDto.date)
    );
  }

  @MessagePattern('get.training.plan.statistics')
  getTrainingPlanStatistics(
    @Payload() datePeriodDto: DatePeriodDto
  ) {
    return this.trainingPlanStatsService.getTrainingPlanStatistics(
      datePeriodDto.period,
      new Date(datePeriodDto.date)
    );
  }

    @MessagePattern('find.all.training.stats')
    findAllExerciseStats(@Payload() paginationDto: PaginationDto) {
      return this.trainingPlanStatsService.findAllTrainingPlanStats(paginationDto);
    }

  @MessagePattern('find.training.plan.statistic.by.id')
  findTrainingPlanStatsById(
    @Payload() statsIdDto: MongoIdDto
  ) {
    return this.trainingPlanStatsService.findTrainingPlanStatsById(statsIdDto.id);
  }

  @MessagePattern('delete.training.plan.statistic.by.id')
  deleteTrainingPlanStatistics(
    @Payload() statsIdDto: MongoIdDto
  ) {
    return this.trainingPlanStatsService.deleteTrainingPlanStatistics(statsIdDto.id);
  }
}