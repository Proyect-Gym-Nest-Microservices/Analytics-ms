import { IsInt } from "class-validator";
import { DatePeriodDto } from "src/common/dto/date-period.dto";

export class ExerciseStatisticsDto extends DatePeriodDto {
    @IsInt()
    exerciseId: number;
}
