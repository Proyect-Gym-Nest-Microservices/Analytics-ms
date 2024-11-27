import { Module } from '@nestjs/common';
import { EquipmentStatsService } from './equipment-stats.service';
import { EquipmentStatsController } from './equipment-stats.controller';

@Module({
  controllers: [EquipmentStatsController],
  providers: [EquipmentStatsService],
})
export class EquipmentStatsModule {}
