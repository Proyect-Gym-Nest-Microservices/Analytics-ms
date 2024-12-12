import { Gender } from "@prisma/client";
import { IsEnum, IsInt, IsString, Min } from "class-validator";

export class TrainingPlanGenderStatsDto {

    @IsEnum(Gender)
    gender: Gender;
  
    @IsInt()
    @Min(0)
    enrollmentCount: number;
  
    @IsInt()
    @Min(0)
    completionCount: number;
}
