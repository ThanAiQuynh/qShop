import { pgTable, integer, primaryKey } from 'drizzle-orm/pg-core';
import { products } from './products';
import { categories } from './categories';

export const productCategories = pgTable(
    'product_categories',
    {
        productId: integer('product_id')
            .notNull()
            .references(() => products.id),
        categoryId: integer('category_id')
            .notNull()
            .references(() => categories.id),
    },
    (table) => [
        primaryKey({ columns: [table.productId, table.categoryId] }),
    ],
);
