import { Transform, Type } from "class-transformer";
import { IsDate, IsEnum, IsNotEmpty, MaxDate } from "class-validator";
import { Period } from "../enums/analytics.enum";

export class DatePeriodDto {

    @IsEnum(Period)
    @IsNotEmpty({ message: 'The period field cannot be empty.' })
    period: Period;

    @IsDate({ message: 'The date must be a valid Date object.' })
    @MaxDate(new Date(), {
        message: 'Date cannot be in the future'
    }) 
    @Transform(({value}) => new Date(value)) 
    date: Date;
}