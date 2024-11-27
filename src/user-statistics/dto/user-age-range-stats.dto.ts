import { IsEnum, IsInt, IsString, Min } from "class-validator";
import { AgeRange } from "../enums/user-stats.enum";

export class UserAgeRangeStatsDto {
    @IsEnum(AgeRange)
    ageRange: AgeRange;

    @IsInt()
    @Min(0)
    count: number;
}