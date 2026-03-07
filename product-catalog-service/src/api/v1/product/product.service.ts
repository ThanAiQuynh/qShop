import { Injectable } from '@nestjs/common';
import { QueryProductDto } from './dto/query-product.dto';
import { ProductRepository } from './repositories/product.repository';
import { ProductImageRepository } from './repositories/product-image.repository';
import { ProductCategoryRepository } from './repositories/product-category.repository';
import { ProductVariantRepository } from './repositories/product-variant.repository';
import { ProductFacetRepository } from './repositories/product-facet.repository';
import { BrandRepository } from './repositories/brand.repository';
import { PriceHistoryRepository } from './repositories/price-history.repository';

@Injectable()
export class ProductService {
    constructor(
        private readonly productRepo: ProductRepository,
        private readonly imageRepo: ProductImageRepository,
        private readonly categoryRepo: ProductCategoryRepository,
        private readonly variantRepo: ProductVariantRepository,
        private readonly facetRepo: ProductFacetRepository,
        private readonly brandRepo: BrandRepository,
        private readonly priceHistoryRepo: PriceHistoryRepository,
    ) { }

    async findAll(query: QueryProductDto) {
        // TODO: tổ hợp productRepo.paginate + facetRepo.countFacets
        // rồi batch load imageRepo + variantRepo
    }

    async findById(id: number) {
        // TODO: Promise.all([
        //   productRepo.findById(id),
        //   imageRepo.findByProductId(id),
        //   variantRepo.findFlattenedByProductId(id),
        //   categoryRepo.findCategoryIdsByProductId(id),
        // ])
    }

    async findBySlug(slug: string) {
        // TODO: productRepo.findBySlug(slug)
        // rồi load images + variants song song
    }

    async remove(id: number) {
        // TODO: productRepo.softDelete(id)
    }
}
