import { pgTable, integer, varchar, decimal, index } from 'drizzle-orm/pg-core';
import { products } from './products';
import { productVariants } from './product_variants';

export const variantFlattened = pgTable(
    'variant_flattened',
    {
        variantId: integer('variant_id')
            .notNull()
            .primaryKey()
            .references(() => productVariants.id),
        productId: integer('product_id')
            .notNull()
            .references(() => products.id),
        color: varchar('color', { length: 100 }),
        size: varchar('size', { length: 100 }),
        storage: varchar('storage', { length: 100 }),
        price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    },
    (table) => [
        index('flattened_color_idx').on(table.color),
        index('flattened_size_idx').on(table.size),
        index('flattened_storage_idx').on(table.storage),
        index('flattened_price_idx').on(table.price),
        index('flattened_listing_idx').on(table.productId, table.color, table.price),
    ],
);
