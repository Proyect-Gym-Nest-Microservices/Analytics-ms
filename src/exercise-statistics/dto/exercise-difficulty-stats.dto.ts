import { IsEnum, IsInt, Min } from "class-validator";
import { Difficulty } from "src/common/enums/analytics.enum";


export class ExerciseDifficultyStatsDto{
    @IsEnum(Difficulty)
    difficulty: Difficulty;
  
    @IsInt()
    @Min(0)
    useCount: number;
}