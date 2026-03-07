import { Injectable } from '@nestjs/common';
import { db, schema } from '../../../../database/db';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

@Injectable()
export class PriceHistoryRepository {

    /** Lịch sử giá của variant — dùng price_history_variant_id_changed_at_idx */
    async findByVariantId(variantId: number, limit: number = 20) {
        // TODO: WHERE variant_id = ? ORDER BY changed_at DESC LIMIT ?
    }

    /** Ghi log thay đổi giá */
    async insert(data: typeof schema.priceHistory.$inferInsert, tx?: Tx) {
        // TODO: (tx ?? db).insert(priceHistory).values(data)
    }
}
