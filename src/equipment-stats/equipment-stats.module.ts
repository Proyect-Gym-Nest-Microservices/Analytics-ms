import { Module } from '@nestjs/common';
import { EquipmentStatsService } from './equipment-stats.service';
import { EquipmentStatsController } from './equipment-stats.controller';
import { NatsModule } from 'src/transports/nats.module';

@Module({
  controllers: [EquipmentStatsController],
  providers: [EquipmentStatsService],
  imports:[NatsModule]
})
export class EquipmentStatsModule {}
