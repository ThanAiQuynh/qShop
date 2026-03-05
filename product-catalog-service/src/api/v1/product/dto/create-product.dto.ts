import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches, MaxLength } from 'class-validator';
import { ProductStatus } from 'src/common/constants/product-status.enum';

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-z0-9-]+$/, { message: 'Slug must contain only lowercase letters, numbers, and hyphens' })
    slug: string;

    @IsInt()
    @IsPositive()
    brandId: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(ProductStatus)
    @IsOptional()
    status?: ProductStatus = ProductStatus.DRAFT;
}
