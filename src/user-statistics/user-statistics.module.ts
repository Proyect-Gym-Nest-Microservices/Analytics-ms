import { Module } from '@nestjs/common';
import { UserStatisticsService } from './user-statistics.service';
import { UserStatisticsController } from './user-statistics.controller';
import { NatsModule } from 'src/transports/nats.module';

@Module({
  controllers: [UserStatisticsController],
  providers: [UserStatisticsService],
  imports:[NatsModule]
})
export class UserStatisticsModule {}
