import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsNumber, Min, ValidateNested } from "class-validator";
import { WorkoutGenderStatsDto } from "./workout-gender-stats.dto";
import { WorkoutCompletionStatsDto } from "./workout-completion-stats.dto";
import { BaseStatsDto } from "src/common/dto/base-stats.dto";
import { Period } from "src/common/enums/analytics.enum";
import { WorkoutCategoryStatsDto } from "./workout-category-stats.dto";
import { WorkoutDifficultyStatsDto } from "./workout-difficulty-stats.dto";

export class WorkoutStatisticsDto extends BaseStatsDto {

    @IsInt()
    workoutId: number;

    @IsNumber()
    @Min(0)
    popularityScore: number;



    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WorkoutGenderStatsDto)
    genderStats: WorkoutGenderStatsDto[];
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WorkoutDifficultyStatsDto)
    difficultyStats: WorkoutDifficultyStatsDto[];
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WorkoutCategoryStatsDto)
    categoryStats: WorkoutCategoryStatsDto[];
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WorkoutCompletionStatsDto)
    completionStats: WorkoutCompletionStatsDto[];

}