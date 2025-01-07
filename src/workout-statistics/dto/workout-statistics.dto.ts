import { IsInt } from "class-validator";
import { DatePeriodDto } from "src/common/dto/date-period.dto";

export class WorkoutStatisticsDto extends DatePeriodDto {

    @IsInt()
    workoutId: number;


}