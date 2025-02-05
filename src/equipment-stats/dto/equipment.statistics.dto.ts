import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { DatePeriodDto } from '../../common/dto/date-period.dto';

export class EquipmentStatisticsDto extends DatePeriodDto{

    @IsInt()
    equipmentId: number;

}

