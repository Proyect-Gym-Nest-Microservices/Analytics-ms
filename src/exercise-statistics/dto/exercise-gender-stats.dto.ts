import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { Gender } from "src/common/enums/analytics.enum";

export class ExerciseGenderStatsDto {

    @IsEnum(Gender)
    gender: Gender;

    @IsInt()
    @Min(0)
    useCount: number;

}