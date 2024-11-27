import { Injectable } from '@nestjs/common';
import { CreateTrainingPlanStatDto } from './dto/create-training-plan-stat.dto';
import { UpdateTrainingPlanStatDto } from './dto/update-training-plan-stat.dto';

@Injectable()
export class TrainingPlanStatsService {
  create(createTrainingPlanStatDto: CreateTrainingPlanStatDto) {
    return 'This action adds a new trainingPlanStat';
  }

  findAll() {
    return `This action returns all trainingPlanStats`;
  }

  findOne(id: number) {
    return `This action returns a #${id} trainingPlanStat`;
  }

  update(id: number, updateTrainingPlanStatDto: UpdateTrainingPlanStatDto) {
    return `This action updates a #${id} trainingPlanStat`;
  }

  remove(id: number) {
    return `This action removes a #${id} trainingPlanStat`;
  }
}
