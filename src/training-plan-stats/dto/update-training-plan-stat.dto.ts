import { PartialType } from '@nestjs/mapped-types';
import { TrainingPlanStatisticsDto } from './trainingplan-statistics.dto';

export class UpdateTrainingPlanStatDto extends PartialType(TrainingPlanStatisticsDto) {
}
