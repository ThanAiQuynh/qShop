import { Injectable } from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import { db } from "src/database/db";
import { products } from "src/database/schema/products";
import { ProductStatus } from "src/common/constants/product-status.enum";
import { eq } from "drizzle-orm";


@Injectable()
export class ProductRepository {
    async create(dto: CreateProductDto) {
        const [product] = await db.insert(products).values({
            name: dto.name,
            slug: dto.slug,
            brandId: dto.brandId,
            description: dto.description,
            status: dto.status ?? ProductStatus.DRAFT,
        }).returning();

        return product;
    }

    async findBySlug(slug: string) {
        return db.query.products.findFirst({
            where: eq(products.slug, slug),
        });
    }
}