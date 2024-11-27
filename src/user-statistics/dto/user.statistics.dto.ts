import { IsArray, IsInt, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { UserGenderStatsDto } from "./user-gender-stats.dto";
import { UserGoalStatsDto } from "./user-goals-stats.dto";
import { UserAgeRangeStatsDto } from "./user-age-range-stats.dto";
import { BaseStatsDto } from "src/common/dto/base-stats.dto";

export class UserStatisticsDto extends BaseStatsDto {
    @IsInt()
    @Min(0)
    totalUsers: number;

    @IsInt()
    @Min(0)
    newUsers: number;

    @IsInt()
    @Min(0)
    activeUsers: number;

    @IsInt()
    @Min(0)
    inactiveUsers: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UserGenderStatsDto)
    genderStats: UserGenderStatsDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UserGoalStatsDto)
    goalStats: UserGoalStatsDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UserAgeRangeStatsDto)
    ageRangeStats: UserAgeRangeStatsDto[];
}