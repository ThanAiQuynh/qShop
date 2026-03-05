import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { ProductRepository } from "./product.repository";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { CreateProductDto } from "./dto/create-product.dto";
import type { Cache } from 'cache-manager';

@Injectable()
export class ProductService {
    constructor(
        private readonly productRepository: ProductRepository,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ){}

    async create(dto: CreateProductDto) {
        const existing = await this.productRepository.findBySlug(dto.slug);
        if (existing) {
            throw new ConflictException(`Slug '${dto.slug}' already exists`);
        }

        const product = await this.productRepository.create(dto);
        return product;
    }
}