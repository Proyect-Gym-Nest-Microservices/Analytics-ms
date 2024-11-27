import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsObject, IsDate, IsArray, IsString, ValidateNested, IsEnum,} from 'class-validator';
import { Period } from 'src/common/enums/period.enum';
import { EquipmentGenderStatsDto } from './equipment-gender-stats.dto';
import { EquipmentHourlyStatsDto } from './equipment-hourly-stats.dto';

export class EquipmentStatisticsDto {

    @IsInt()
    equipmentId: number;

    @IsInt()
    totalUses: number;

    @IsObject()
    usesByGender: Record<string, number>; // Ejemplo de JSON

    @IsInt()
    averageTimeOfUse: number;

    @IsObject()
    peakUsageHours: { hour: number };

    @IsEnum(Period)
    period: Period;

    @IsDate()
    date: Date;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EquipmentGenderStatsDto)
    genderStats: EquipmentGenderStatsDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EquipmentHourlyStatsDto)
    hourlyStats: EquipmentHourlyStatsDto[];
}
