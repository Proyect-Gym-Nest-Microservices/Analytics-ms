import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EquipmentStatsService } from './equipment-stats.service';
import { EquipmentStatisticsDto } from './dto/equipment.statistics.dto';
import { DatePeriodDto } from 'src/common/dto/date-period.dto';
import { MongoIdDto } from 'src/common/dto/mongo-id.dto';

@Controller()
export class EquipmentStatsController {
  constructor(private readonly equipmentStatsService: EquipmentStatsService) {}

  @MessagePattern('generate.equipment.statistics')
  generateUserStatistics(
    @Payload() equipmentStatsDto:EquipmentStatisticsDto
  ) {
    return this.equipmentStatsService.generateEquipmentStatistics(equipmentStatsDto);
  }

  @MessagePattern('get.equipment.statistics')
  getEquipmentStatistics(
    @Payload() datePeriodDto:DatePeriodDto
  ) {
    return this.equipmentStatsService.getEquipmentStatistics(
      datePeriodDto.period,
      new Date(datePeriodDto.date)
    );
  }
  @MessagePattern('find.equipment.statistic.by.id')
  findEquipmentStatsById(
    @Payload() statsIdDto:MongoIdDto
  ) {
    return this.equipmentStatsService.findEquipmentStatsById(statsIdDto.id);
  }
  @MessagePattern('delete.equipment.statistic.by.id')
  deleteEquipmentStatistics(
    @Payload() statsIdDto:MongoIdDto
  ) {
    return this.equipmentStatsService.deleteEquipmentStatistics(statsIdDto.id);
  }
}
