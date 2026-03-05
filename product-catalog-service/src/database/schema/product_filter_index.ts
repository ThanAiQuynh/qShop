import { pgTable, integer, decimal, text, index } from 'drizzle-orm/pg-core';
import { products } from './products';
import { categories } from './categories';

export const productFilterIndex = pgTable(
    'product_filter_index',
    {
        productId: integer('product_id')
            .notNull()
            .references(() => products.id),
        categoryId: integer('category_id')
            .notNull()
            .references(() => categories.id),
        minPrice: decimal('min_price', { precision: 12, scale: 2 }).notNull(),
        maxPrice: decimal('max_price', { precision: 12, scale: 2 }).notNull(),
        colors: text('colors').array(), // PostgreSQL text array
        sizes: text('sizes').array(),
        storages: text('storages').array(),
    },
    (table) => [
        index('filter_index_cat_price_idx').on(table.categoryId, table.minPrice, table.maxPrice),
    ],
);
