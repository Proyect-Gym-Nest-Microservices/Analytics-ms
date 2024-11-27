import { IsEnum, IsInt, IsString, Min } from "class-validator";
import { Gender } from "src/common/enums/period.enum";

export class UserGenderStatsDto {
  
    @IsEnum(Gender)
    gender: Gender;
  
    @IsInt()
    @Min(0)
    count: number;
}