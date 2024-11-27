import { Type } from "class-transformer";
import { IsArray, IsInt, IsNumber, IsOptional, Min, ValidateNested } from "class-validator";
import { BaseStatsDto } from "src/common/dto/base-stats.dto";
import { ExerciseGenderStatsDto } from "./exercise-gender-stats.dto";

export class ExerciseStatisticsDto extends BaseStatsDto {
    @IsInt()
    exerciseId: number;

    @IsInt()
    @Min(0)
    totalUses: number;

    @IsNumber()
    @Min(0)
    popularityScore: number;

    @IsNumber()
    @IsOptional()
    averageWeight?: number;

    @IsInt()
    @Min(0)
    averageReps: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ExerciseGenderStatsDto)
    genderStats: ExerciseGenderStatsDto[];


}
