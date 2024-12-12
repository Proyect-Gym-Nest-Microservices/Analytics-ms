import { IsEnum, IsInt, IsString, Min } from "class-validator";
import { Gender } from "src/common/enums/analytics.enum";

export class WorkoutGenderStatsDto {

    @IsEnum(Gender)
    gender: Gender;

    @IsInt()
    @Min(0)
    completionCount: number;

    @IsInt()
    @Min(0)
    averageDuration: number;
}