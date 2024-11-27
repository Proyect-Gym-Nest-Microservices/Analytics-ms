import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WorkoutStatisticsService } from './workout-statistics.service';
import { CreateWorkoutStatisticDto } from './dto/create-workout-statistic.dto';
import { UpdateWorkoutStatisticDto } from './dto/update-workout-statistic.dto';

@Controller()
export class WorkoutStatisticsController {
  constructor(private readonly workoutStatisticsService: WorkoutStatisticsService) {}

  @MessagePattern('createWorkoutStatistic')
  create(@Payload() createWorkoutStatisticDto: CreateWorkoutStatisticDto) {
    return this.workoutStatisticsService.create(createWorkoutStatisticDto);
  }

  @MessagePattern('findAllWorkoutStatistics')
  findAll() {
    return this.workoutStatisticsService.findAll();
  }

  @MessagePattern('findOneWorkoutStatistic')
  findOne(@Payload() id: number) {
    return this.workoutStatisticsService.findOne(id);
  }

  @MessagePattern('updateWorkoutStatistic')
  update(@Payload() updateWorkoutStatisticDto: UpdateWorkoutStatisticDto) {
    return this.workoutStatisticsService.update(updateWorkoutStatisticDto.id, updateWorkoutStatisticDto);
  }

  @MessagePattern('removeWorkoutStatistic')
  remove(@Payload() id: number) {
    return this.workoutStatisticsService.remove(id);
  }
}
