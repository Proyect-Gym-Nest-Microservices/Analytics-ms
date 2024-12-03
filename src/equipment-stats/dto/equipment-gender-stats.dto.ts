import { IsInt, IsString } from "class-validator";


export class EquipmentGenderStatsDto {

    @IsString()
    gender: string;

    @IsInt()
    useCount: number;
}