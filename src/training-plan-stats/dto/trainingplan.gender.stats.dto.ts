import { IsInt, IsString } from "class-validator";

export class TrainingPlanGenderStatsDto {


    @IsString()
    trainingPlanStatId: string;

    @IsString()
    gender: string;

    @IsInt()
    enrollmentCount: number;

    @IsInt()
    completionCount: number;

    @IsInt()
    averageCompletionTime: number; // En días
}
