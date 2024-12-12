import { IsEnum, IsInt, Min } from "class-validator";
import { Category } from "src/common/enums/analytics.enum";


export class ExerciseCategoryStatsDto{

    @IsEnum(Category)
    category: Category;

    @IsInt()
    @Min(0)
    useCount: number;
}