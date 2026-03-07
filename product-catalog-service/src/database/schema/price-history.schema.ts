import {
    pgTable,
    serial,
    varchar,
    numeric,
    integer,
    timestamp,
    index,
} from 'drizzle-orm/pg-core';
import { productVariants } from './variants.schema';

// -----------------------------------------------------------------------
// price_history — Lịch sử biến động giá của từng Variant
// Dùng cho analytics, chart giá, và audit trail
// -----------------------------------------------------------------------
export const priceHistory = pgTable(
    'price_history',
    {
        id: serial('id').primaryKey(),
        variantId: integer('variant_id')
            .notNull()
            .references(() => productVariants.id, { onDelete: 'cascade' }),
        oldPrice: numeric('old_price', { precision: 15, scale: 2 }).notNull(),
        newPrice: numeric('new_price', { precision: 15, scale: 2 }).notNull(),
        /** User ID hoặc "system" nếu thay đổi tự động */
        changedBy: varchar('changed_by', { length: 255 }),
        changedAt: timestamp('changed_at').defaultNow().notNull(),
    },
    (t) => [
        // Lịch sử giá theo variant, sắp xếp theo thời gian
        index('price_history_variant_id_changed_at_idx').on(
            t.variantId,
            t.changedAt,
        ),
    ],
);

export type PriceHistory = typeof priceHistory.$inferSelect;
export type NewPriceHistory = typeof priceHistory.$inferInsert;
