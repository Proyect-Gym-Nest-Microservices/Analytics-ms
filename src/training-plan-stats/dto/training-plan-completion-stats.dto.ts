import { IsEnum, IsInt, Min } from "class-validator";
import { CompletionStatus } from "src/common/enums/analytics.enum";


export class TrainingPlanCompletionStatsDto {
    @IsEnum(CompletionStatus)
    completionStatus: CompletionStatus;

    @IsInt()
    @Min(0)
    count: number;
}
