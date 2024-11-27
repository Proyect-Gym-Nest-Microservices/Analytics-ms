import { IsEnum, IsInt, IsString, Min } from "class-validator";
import { CompletionStatus } from "../enums/workout-stats.enum";

export class WorkoutCompletionStatsDto {

    @IsEnum(CompletionStatus)
    completionStatus: CompletionStatus;

    @IsInt()
    @Min(0)
    count: number;
}