import { Injectable } from '@nestjs/common';
import { db, schema } from '../../../../database/db';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

@Injectable()
export class ProductRepository {

    // ═══════════════════════════════════════════════════════════════
    //  READ
    // ═══════════════════════════════════════════════════════════════

    /** Lấy 1 product theo PK — WHERE id = ? AND deleted_at IS NULL */
    async findById(id: number) {
        // TODO: db.query.products.findFirst, eq(id), isNull(deletedAt)
    }

    /** Tìm theo slug — dùng products_slug_idx (unique) */
    async findBySlug(slug: string) {
        // TODO: db.query.products.findFirst, eq(slug), isNull(deletedAt)
    }

    /** Batch load products theo mảng ID — WHERE id IN (...) */
    async findByIds(ids: number[]) {
        // TODO: db.select().from(products).where(inArray(id, ids)), isNull(deletedAt)
    }

    /** Cursor pagination — WHERE id > cursor, filter status/brandId, LIMIT limit+1 */
    async paginate(cursor: number | null, limit: number, status?: string, brandId?: number, productIds?: number[]) {
        // TODO: dynamic WHERE builder
        // - id > cursor (nếu có cursor)
        // - status = ? (nếu có) → dùng products_status_deleted_at_idx
        // - brand_id = ? (nếu có) → dùng products_brand_id_status_idx
        // - id IN productIds (nếu có, từ filter index)
        // - deleted_at IS NULL
        // - ORDER BY id ASC, LIMIT limit + 1
        // - return { data, nextCursor, hasNextPage }
    }

    /** Đếm tổng products — cùng WHERE conditions như paginate */
    async count(status?: string, brandId?: number, productIds?: number[]) {
        // TODO: SELECT count(*) với cùng WHERE như paginate
    }

    // ═══════════════════════════════════════════════════════════════
    //  WRITE
    // ═══════════════════════════════════════════════════════════════

    /** Tạo product mới — INSERT ... RETURNING * */
    async insert(data: typeof schema.products.$inferInsert, tx?: Tx) {
        // TODO: (tx ?? db).insert(products).values(data).returning()
    }

    /** Cập nhật product — UPDATE ... WHERE id = ? RETURNING * */
    async update(id: number, data: Partial<typeof schema.products.$inferInsert>, tx?: Tx) {
        // TODO: (tx ?? db).update(products).set({...data, updatedAt: new Date()}).where(eq(id)).returning()
    }

    /** Soft delete — UPDATE SET deleted_at = NOW() */
    async softDelete(id: number, tx?: Tx) {
        // TODO: (tx ?? db).update(products).set({ deletedAt: new Date() }).where(eq(id))
    }

    // ═══════════════════════════════════════════════════════════════
    //  ARCHIVES — Bảng product_archives
    // ═══════════════════════════════════════════════════════════════

    /** Lưu snapshot JSON trước khi hard delete */
    async insertArchive(originalProductId: number, dataJson: string, tx?: Tx) {
        // TODO: (tx ?? db).insert(productArchives).values({ originalProductId, dataJson })
    }

    /** Tra cứu archive theo original product ID */
    async findArchiveByOriginalId(originalProductId: number) {
        // TODO: WHERE original_product_id = ? ORDER BY deleted_at DESC
    }
}
