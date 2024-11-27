import { Type } from "class-transformer";
import { IsDate, IsEnum, IsString } from "class-validator";
import { Period } from "../enums/period.enum";

export class BaseStatsDto {

    @IsEnum(Period)
    period: Period;

    @IsDate()
    @Type(() => Date)
    date: Date;
}