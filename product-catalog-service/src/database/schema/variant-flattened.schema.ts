import { pgTable, uuid, varchar, decimal, integer, index } from 'drizzle-orm/pg-core';
import { productVariants } from './product-variants.schema';
import { products } from './products.schema';

export const variantFlattened = pgTable(
    'variant_flattened',
    {
        variantId: uuid('variant_id')
            .primaryKey()
            .references(() => productVariants.id, { onDelete: 'cascade' }),
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        color: varchar('color', { length: 100 }),
        size: varchar('size', { length: 100 }),
        storage: varchar('storage', { length: 100 }),
        price: decimal('price', { precision: 15, scale: 2 }).notNull(),
    },
    (t) => [
        index('idx_variant_flattened_color').on(t.color),
        index('idx_variant_flattened_storage').on(t.storage),
    ],
);
