import { IsInt } from "class-validator";
import { DatePeriodDto } from "../../common/dto/date-period.dto";

export class WorkoutStatisticsDto extends DatePeriodDto {

    @IsInt()
    workoutId: number;


}