import { Injectable } from '@nestjs/common';
import { db, schema } from '../../../../database/db';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

@Injectable()
export class ProductCategoryRepository {

    // ═══════════════════════════════════════════════════════════════
    //  READ
    // ═══════════════════════════════════════════════════════════════

    /** Category IDs của 1 product */
    async findCategoryIdsByProductId(productId: number) {
        // TODO: SELECT category_id WHERE product_id = ?
    }

    /** Product IDs thuộc 1 category */
    async findProductIdsByCategoryId(categoryId: number) {
        // TODO: SELECT product_id WHERE category_id = ?
    }

    // ═══════════════════════════════════════════════════════════════
    //  WRITE
    // ═══════════════════════════════════════════════════════════════

    /** Gán categories cho product — batch insert */
    async insertMany(productId: number, categoryIds: number[], tx?: Tx) {
        // TODO: (tx ?? db).insert(productCategories).values(categoryIds.map(cId => ({ productId, categoryId: cId })))
    }

    /** Xóa tất cả category mapping của product */
    async deleteByProductId(productId: number, tx?: Tx) {
        // TODO: (tx ?? db).delete(productCategories).where(eq(productId))
    }
}
