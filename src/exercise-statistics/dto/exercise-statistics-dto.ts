import { Type } from "class-transformer";
import { IsArray, IsDate, IsEnum, IsInt, IsNumber, IsOptional, Min, ValidateNested } from "class-validator";
import { BaseStatsDto } from "src/common/dto/base-stats.dto";
import { ExerciseGenderStatsDto } from "./exercise-gender-stats.dto";
import { Period } from "src/common/enums/analytics.enum";
import { ExerciseCategoryStatsDto } from "./exercise-category-stats.dto";
import { ExerciseDifficultyStatsDto } from "./exercise-difficulty-stats.dto";

export class ExerciseStatisticsDto extends BaseStatsDto{
    @IsInt()
    exerciseId: number;

    @IsInt()
    @IsOptional()
    @Min(0)
    totalUses?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    popularityScore?: number;
    
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ExerciseGenderStatsDto)
    genderStats: ExerciseGenderStatsDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ExerciseCategoryStatsDto)
    categoryStats: ExerciseCategoryStatsDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ExerciseDifficultyStatsDto)
    dificultyStats: ExerciseDifficultyStatsDto[];


}
