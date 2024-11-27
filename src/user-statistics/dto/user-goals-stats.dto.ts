import { IsEnum, IsInt, IsString, Min } from "class-validator";
import { Goal } from "../enums/user-stats.enum";

export class UserGoalStatsDto {
  @IsEnum(Goal)
  goal: Goal;

  @IsInt()
  @Min(0)
  count: number;
}