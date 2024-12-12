import { IsEnum, IsInt, Min } from "class-validator";
import { Gender } from "src/common/enums/analytics.enum";

export class UserGenderStatsDto {
  
    @IsEnum(Gender)
    gender: Gender;
  
    @IsInt()
    @Min(0)
    count: number;
}