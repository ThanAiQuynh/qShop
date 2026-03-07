import { Injectable } from '@nestjs/common';
import { db, schema } from '../../../../database/db';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

@Injectable()
export class ProductVariantRepository {

    // ═══════════════════════════════════════════════════════════════
    //  VARIANTS — Bảng product_variants
    // ═══════════════════════════════════════════════════════════════

    /** Tất cả variants của product — dùng product_variants_product_id_deleted_at_idx */
    async findByProductId(productId: number) {
        // TODO: WHERE product_id = ? AND deleted_at IS NULL
    }

    /** Tìm variant theo SKU — dùng product_variants_sku_idx (unique) */
    async findBySku(sku: string) {
        // TODO: WHERE sku = ?
    }

    /** Lọc variants theo khoảng giá — dùng product_variants_price_idx */
    async findByPriceRange(minPrice: number, maxPrice: number) {
        // TODO: WHERE price BETWEEN ? AND ? AND deleted_at IS NULL
    }

    // ═══════════════════════════════════════════════════════════════
    //  FLATTENED — Bảng variant_flattened (denormalized)
    // ═══════════════════════════════════════════════════════════════

    /** Flatten variants của 1 product — thay thế JOIN 3 bảng */
    async findFlattenedByProductId(productId: number) {
        // TODO: WHERE product_id = ?
    }

    /** Batch load flatten cho listing */
    async findFlattenedByProductIds(productIds: number[]) {
        // TODO: WHERE product_id IN (...)
    }

    /** Lọc variant theo attributes — dynamic WHERE builder */
    async findFlattenedByFilter(color?: string, size?: string, storage?: string, minPrice?: number, maxPrice?: number) {
        // TODO: dynamic WHERE
        // - color = ? (nếu có) → dùng variant_flattened_color_idx
        // - size = ? (nếu có) → dùng variant_flattened_size_idx
        // - storage = ? (nếu có) → dùng variant_flattened_storage_idx
        // - price BETWEEN ? AND ? (nếu có) → dùng variant_flattened_price_idx
    }
}
