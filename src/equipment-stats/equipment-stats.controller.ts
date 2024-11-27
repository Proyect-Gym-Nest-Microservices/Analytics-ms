import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EquipmentStatsService } from './equipment-stats.service';
import { CreateEquipmentStatDto } from './dto/create-equipment-stat.dto';
import { UpdateEquipmentStatDto } from './dto/update-equipment-stat.dto';

@Controller()
export class EquipmentStatsController {
  constructor(private readonly equipmentStatsService: EquipmentStatsService) {}

  @MessagePattern('createEquipmentStat')
  create(@Payload() createEquipmentStatDto: CreateEquipmentStatDto) {
    return this.equipmentStatsService.create(createEquipmentStatDto);
  }

  @MessagePattern('findAllEquipmentStats')
  findAll() {
    return this.equipmentStatsService.findAll();
  }

  @MessagePattern('findOneEquipmentStat')
  findOne(@Payload() id: number) {
    return this.equipmentStatsService.findOne(id);
  }

  @MessagePattern('updateEquipmentStat')
  update(@Payload() updateEquipmentStatDto: UpdateEquipmentStatDto) {
    return this.equipmentStatsService.update(updateEquipmentStatDto.id, updateEquipmentStatDto);
  }

  @MessagePattern('removeEquipmentStat')
  remove(@Payload() id: number) {
    return this.equipmentStatsService.remove(id);
  }
}
