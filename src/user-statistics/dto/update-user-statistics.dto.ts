import { PartialType } from '@nestjs/mapped-types';
import { UserStatisticsDto } from './user.statistics.dto';

export class UpdateAnalyticsDto extends PartialType(UserStatisticsDto) {
}
