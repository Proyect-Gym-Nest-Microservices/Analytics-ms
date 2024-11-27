import { PartialType } from '@nestjs/mapped-types';
import { ExerciseStatisticsDto } from './exercise-statistics-dto';

export class UpdateExerciseStatisticDto extends PartialType(ExerciseStatisticsDto) {
}
