import { Type } from "class-transformer";
import { IsArray, IsInt, IsNumber, Min, ValidateNested } from "class-validator";
import { WorkoutGenderStatsDto } from "./workout-gender-stats.dto";
import { WorkoutCompletionStatsDto } from "./workout-completion-stats.dto";
import { BaseStatsDto } from "src/common/dto/base-stats.dto";

export class WorkoutStatisticsDto extends BaseStatsDto {

    @IsInt()
    @Min(0)
    totalCompletions: number;

    @IsInt()
    @Min(0)
    averageDuration: number;

    @IsNumber()
    @Min(0)
    popularityScore: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WorkoutGenderStatsDto)
    genderStats: WorkoutGenderStatsDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WorkoutCompletionStatsDto)
    completionStats: WorkoutCompletionStatsDto[];
}