import { pgTable, serial, integer, decimal, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { productVariants } from './product_variants';

export const priceHistory = pgTable(
    'price_history',
    {
        id: serial('id').primaryKey(),
        variantId: integer('variant_id')
            .notNull()
            .references(() => productVariants.id),
        oldPrice: decimal('old_price', { precision: 12, scale: 2 }).notNull(),
        newPrice: decimal('new_price', { precision: 12, scale: 2 }).notNull(),
        changedBy: varchar('changed_by', { length: 255 }),
        changedAt: timestamp('changed_at').defaultNow().notNull(),
    },
    (table) => [
        index('price_history_variant_date_idx').on(table.variantId, table.changedAt),
    ],
);
