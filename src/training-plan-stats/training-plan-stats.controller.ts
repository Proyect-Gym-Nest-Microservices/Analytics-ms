import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TrainingPlanStatsService } from './training-plan-stats.service';
import { UpdateTrainingPlanStatDto } from './dto/update-training-plan-stat.dto';

@Controller()
export class TrainingPlanStatsController {
  constructor(private readonly trainingPlanStatsService: TrainingPlanStatsService) {}

  //@MessagePattern('createTrainingPlanStat')
  //create(@Payload() createTrainingPlanStatDto: CreateTrainingPlanStatDto) {
  //  return this.trainingPlanStatsService.create(createTrainingPlanStatDto);
  //}

  //@MessagePattern('findAllTrainingPlanStats')
  //findAll() {
  //  return this.trainingPlanStatsService.findAll();
  //}

  //@MessagePattern('findOneTrainingPlanStat')
  //findOne(@Payload() id: number) {
  //  return this.trainingPlanStatsService.findOne(id);
  //}

  //@MessagePattern('updateTrainingPlanStat')
  //update(@Payload() updateTrainingPlanStatDto: UpdateTrainingPlanStatDto) {
  //  return this.trainingPlanStatsService.update(updateTrainingPlanStatDto.id, updateTrainingPlanStatDto);
  //}

  //@MessagePattern('removeTrainingPlanStat')
  //remove(@Payload() id: number) {
  //  return this.trainingPlanStatsService.remove(id);
  //}
}
