import { Type } from 'class-transformer';
import {
    IsInt,
    IsNotEmpty,
    IsObject,
    IsDate,
    IsArray,
    IsString,
    ValidateNested,
    IsNumber,
    IsEnum,
} from 'class-validator';
import { Period } from 'src/common/enums/period.enum';
import { TrainingPlanGenderStatsDto } from './trainingplan.gender.stats.dto';

export class TrainingPlanStatisticsDto {


    @IsInt()
    trainingPlanId: number;

    @IsInt()
    totalEnrollments: number;

    @IsNumber()
    completionRate: number;

    @IsInt()
    averageCompletionTime: number; // En días

    @IsNumber()
    abandonmentRate: number;

    @IsEnum(Period)
    period: Period;

    @IsDate()
    date: Date;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TrainingPlanGenderStatsDto)
    genderStats: TrainingPlanGenderStatsDto[];
}
