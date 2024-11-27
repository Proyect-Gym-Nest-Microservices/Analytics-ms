import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ExerciseStatisticsService } from './exercise-statistics.service';
import { CreateExerciseStatisticDto } from './dto/create-exercise-statistic.dto';
import { UpdateExerciseStatisticDto } from './dto/update-exercise-statistic.dto';

@Controller()
export class ExerciseStatisticsController {
  constructor(private readonly exerciseStatisticsService: ExerciseStatisticsService) {}

  @MessagePattern('createExerciseStatistic')
  create(@Payload() createExerciseStatisticDto: CreateExerciseStatisticDto) {
    return this.exerciseStatisticsService.create(createExerciseStatisticDto);
  }

  @MessagePattern('findAllExerciseStatistics')
  findAll() {
    return this.exerciseStatisticsService.findAll();
  }

  @MessagePattern('findOneExerciseStatistic')
  findOne(@Payload() id: number) {
    return this.exerciseStatisticsService.findOne(id);
  }

  @MessagePattern('updateExerciseStatistic')
  update(@Payload() updateExerciseStatisticDto: UpdateExerciseStatisticDto) {
    return this.exerciseStatisticsService.update(updateExerciseStatisticDto.id, updateExerciseStatisticDto);
  }

  @MessagePattern('removeExerciseStatistic')
  remove(@Payload() id: number) {
    return this.exerciseStatisticsService.remove(id);
  }
}
