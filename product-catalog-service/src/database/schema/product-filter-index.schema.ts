import { pgTable, uuid, decimal, jsonb } from 'drizzle-orm/pg-core';
import { products } from './products.schema';
import { categories } from './categories.schema';

export const productFilterIndex = pgTable('product_filter_index', {
    productId: uuid('product_id')
        .primaryKey()
        .references(() => products.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id, {
        onDelete: 'set null',
    }),
    minPrice: decimal('min_price', { precision: 15, scale: 2 }),
    maxPrice: decimal('max_price', { precision: 15, scale: 2 }),
    colors: jsonb('colors').$type<string[]>(),
    sizes: jsonb('sizes').$type<string[]>(),
    storages: jsonb('storages').$type<string[]>(),
});
