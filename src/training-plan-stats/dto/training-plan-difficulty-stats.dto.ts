import { IsEnum, IsInt, Min } from "class-validator";
import { Difficulty } from "src/common/enums/analytics.enum";


export class TrainingPlanDifficultyStatsDto {
    @IsEnum(Difficulty)
    difficulty: Difficulty;

    @IsInt()
    @Min(0)
    enrollmentCount: number;

    @IsInt()
    @Min(0)
    completionCount: number;
}