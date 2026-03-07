import { Injectable } from '@nestjs/common';
import { db, schema } from '../../../../database/db';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

@Injectable()
export class ProductImageRepository {

    // ═══════════════════════════════════════════════════════════════
    //  READ
    // ═══════════════════════════════════════════════════════════════

    /** Tất cả ảnh của 1 product — ORDER BY position */
    async findByProductId(productId: number) {
        // TODO: WHERE product_id = ? AND deleted_at IS NULL ORDER BY position
    }

    /** Ảnh đại diện — is_primary = 1, variant_id IS NULL */
    async findPrimaryImage(productId: number) {
        // TODO: WHERE product_id = ? AND is_primary = 1 AND variant_id IS NULL LIMIT 1
    }

    /** Batch ảnh primary cho listing — WHERE product_id IN (...) */
    async findPrimaryImagesByProductIds(productIds: number[]) {
        // TODO: WHERE product_id IN (...) AND is_primary = 1 AND deleted_at IS NULL
    }

    // ═══════════════════════════════════════════════════════════════
    //  WRITE
    // ═══════════════════════════════════════════════════════════════

    /** Thêm 1 ảnh */
    async insert(data: typeof schema.productImages.$inferInsert, tx?: Tx) {
        // TODO: (tx ?? db).insert(productImages).values(data).returning()
    }

    /** Thêm nhiều ảnh — batch insert */
    async insertMany(data: (typeof schema.productImages.$inferInsert)[], tx?: Tx) {
        // TODO: (tx ?? db).insert(productImages).values(data).returning()
    }

    /** Xóa tất cả ảnh của product */
    async deleteByProductId(productId: number, tx?: Tx) {
        // TODO: (tx ?? db).delete(productImages).where(eq(productId))
    }
}
