import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProductDto {
    @IsOptional()
    @IsEnum(['active', 'draft'])
    status?: 'active' | 'draft';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    brandId?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    categoryId?: number;
}
