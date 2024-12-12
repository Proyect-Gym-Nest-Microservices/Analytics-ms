import { Type } from 'class-transformer';
import {IsInt,IsDate,IsArray,ValidateNested,IsNumber,IsEnum, Min} from 'class-validator';
import { Period } from 'src/common/enums/analytics.enum';
import { TrainingPlanGenderStatsDto } from './trainingplan.gender.stats.dto';
import { TrainingPlanDifficultyStatsDto } from './training-plan-difficulty-stats.dto';
import { TrainingPlanCompletionStatsDto } from './training-plan-completion-stats.dto';

export class TrainingPlanStatisticsDto {


    @IsInt()
    trainingPlanId: number;

    @IsInt()
    totalEnrollments: number;

    @IsInt()
    @Min(0)
    totalCompletions: number;





    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TrainingPlanGenderStatsDto)
    genderStats: TrainingPlanGenderStatsDto[];
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TrainingPlanDifficultyStatsDto)
    difficultyStats: TrainingPlanDifficultyStatsDto[];
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TrainingPlanCompletionStatsDto)
    completionStats: TrainingPlanCompletionStatsDto[];
  
}
