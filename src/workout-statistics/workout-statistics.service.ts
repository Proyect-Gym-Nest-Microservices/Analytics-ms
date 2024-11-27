import { Injectable } from '@nestjs/common';
import { CreateWorkoutStatisticDto } from './dto/create-workout-statistic.dto';
import { UpdateWorkoutStatisticDto } from './dto/update-workout-statistic.dto';

@Injectable()
export class WorkoutStatisticsService {
  create(createWorkoutStatisticDto: CreateWorkoutStatisticDto) {
    return 'This action adds a new workoutStatistic';
  }

  findAll() {
    return `This action returns all workoutStatistics`;
  }

  findOne(id: number) {
    return `This action returns a #${id} workoutStatistic`;
  }

  update(id: number, updateWorkoutStatisticDto: UpdateWorkoutStatisticDto) {
    return `This action updates a #${id} workoutStatistic`;
  }

  remove(id: number) {
    return `This action removes a #${id} workoutStatistic`;
  }
}
