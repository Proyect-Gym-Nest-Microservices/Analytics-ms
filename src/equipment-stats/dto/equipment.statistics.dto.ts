import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsObject, IsDate, IsArray, IsString, ValidateNested, IsEnum, IsNumber, Min,} from 'class-validator';
import { Period } from 'src/common/enums/period.enum';
import { EquipmentGenderStatsDto } from './equipment-gender-stats.dto';
import { BaseStatsDto } from 'src/common/dto/base-stats.dto';

export class EquipmentStatisticsDto extends BaseStatsDto{

    @IsInt()
    equipmentId: number;

    @IsInt()
    totalUses: number;

    @IsNumber()
    @Min(0)
    popularityScore: number


    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EquipmentGenderStatsDto)
    genderStats: EquipmentGenderStatsDto[];

}
