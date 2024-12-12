import { IsEnum, IsInt, IsString, Min } from "class-validator";
import { Gender } from "src/common/enums/analytics.enum";


export class EquipmentGenderStatsDto {

    @IsEnum(Gender)
    gender: Gender;
  
    @IsInt()
    @Min(0)
    useCount: number;
}