import { IsEnum, IsInt, Min } from "class-validator";
import { Category } from "src/common/enums/analytics.enum";

export class WorkoutCategoryStatsDto {
    @IsEnum(Category)
    category: Category;

    @IsInt()
    @Min(0)
    totalCompletions: number;
}
