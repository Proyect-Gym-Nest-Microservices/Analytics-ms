import { PartialType } from '@nestjs/mapped-types';
import { EquipmentStatisticsDto } from './equipment.statistics.dto';

export class UpdateEquipmentStatDto extends PartialType(EquipmentStatisticsDto) {
}
