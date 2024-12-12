import { IsEnum, IsInt, Min } from "class-validator";
import { Difficulty } from "src/common/enums/analytics.enum";


export class WorkoutDifficultyStatsDto {
    @IsEnum(Difficulty)
    difficulty: Difficulty;

    @IsInt()
    @Min(0)
    totalCompletions: number;
}