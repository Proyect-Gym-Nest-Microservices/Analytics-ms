import { Injectable } from '@nestjs/common';
import { CreateEquipmentStatDto } from './dto/create-equipment-stat.dto';
import { UpdateEquipmentStatDto } from './dto/update-equipment-stat.dto';

@Injectable()
export class EquipmentStatsService {
  create(createEquipmentStatDto: CreateEquipmentStatDto) {
    return 'This action adds a new equipmentStat';
  }

  findAll() {
    return `This action returns all equipmentStats`;
  }

  findOne(id: number) {
    return `This action returns a #${id} equipmentStat`;
  }

  update(id: number, updateEquipmentStatDto: UpdateEquipmentStatDto) {
    return `This action updates a #${id} equipmentStat`;
  }

  remove(id: number) {
    return `This action removes a #${id} equipmentStat`;
  }
}
