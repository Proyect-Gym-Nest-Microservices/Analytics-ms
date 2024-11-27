import { PartialType } from '@nestjs/mapped-types';
import { WorkoutStatisticsDto } from './workout-statistics.dto';

export class UpdateWorkoutStatisticDto extends PartialType(WorkoutStatisticsDto) {
}
