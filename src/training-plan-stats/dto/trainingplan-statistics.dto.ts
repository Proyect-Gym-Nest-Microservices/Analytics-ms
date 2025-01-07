import { IsInt } from 'class-validator';
import { DatePeriodDto } from 'src/common/dto/date-period.dto';

export class TrainingPlanStatisticsDto extends DatePeriodDto {

    @IsInt()
    trainingPlanId: number;

}
