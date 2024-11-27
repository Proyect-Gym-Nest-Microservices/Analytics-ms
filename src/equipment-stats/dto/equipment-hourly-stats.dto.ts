import { IsInt, IsString } from "class-validator";

export class EquipmentHourlyStatsDto {

    @IsString()
    equipmentStatId: string;

    @IsInt()
    hour: number; // Debe estar entre 0 y 23, puedes agregar una validación adicional si es necesario

    @IsInt()
    useCount: number;

    @IsInt()
    averageTimeOfUse: number;
}
