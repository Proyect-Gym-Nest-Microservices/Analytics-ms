import { IsInt, IsString } from "class-validator";


export class EquipmentGenderStatsDto {

    @IsString()
    equipmentStatisticsId: string;

    @IsString()
    gender: string;

    @IsInt()
    useCount: number;
}