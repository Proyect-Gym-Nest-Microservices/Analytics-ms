import { Injectable } from '@nestjs/common';
import { CreateExerciseStatisticDto } from './dto/create-exercise-statistic.dto';
import { UpdateExerciseStatisticDto } from './dto/update-exercise-statistic.dto';

@Injectable()
export class ExerciseStatisticsService {
  create(createExerciseStatisticDto: CreateExerciseStatisticDto) {
    return 'This action adds a new exerciseStatistic';
  }

  findAll() {
    return `This action returns all exerciseStatistics`;
  }

  findOne(id: number) {
    return `This action returns a #${id} exerciseStatistic`;
  }

  update(id: number, updateExerciseStatisticDto: UpdateExerciseStatisticDto) {
    return `This action updates a #${id} exerciseStatistic`;
  }

  remove(id: number) {
    return `This action removes a #${id} exerciseStatistic`;
  }
}
