import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from './repositories/product.repository';
import { ProductImageRepository } from './repositories/product-image.repository';
import { ProductCategoryRepository } from './repositories/product-category.repository';
import { ProductVariantRepository } from './repositories/product-variant.repository';
import { ProductFacetRepository } from './repositories/product-facet.repository';
import { BrandRepository } from './repositories/brand.repository';
import { PriceHistoryRepository } from './repositories/price-history.repository';

@Module({
    controllers: [ProductController],
    providers: [
        ProductService,
        ProductRepository,
        ProductImageRepository,
        ProductCategoryRepository,
        ProductVariantRepository,
        ProductFacetRepository,
        BrandRepository,
        PriceHistoryRepository,
    ],
})
export class ProductModule { }
