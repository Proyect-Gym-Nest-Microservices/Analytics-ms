import { Type } from "class-transformer";
import { IsDate, IsEnum, IsOptional, IsString } from "class-validator";
import { Period } from "../enums/analytics.enum";

export class BaseStatsDto {

    @IsEnum(Period)
    period: Period;

    @IsDate()
    @Type(() => Date)
    date: Date;
}