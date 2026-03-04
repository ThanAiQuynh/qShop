import { pgTable, uuid, primaryKey, index } from 'drizzle-orm/pg-core';
import { products } from './products.schema';
import { categories } from './categories.schema';

export const productCategories = pgTable(
    'product_categories',
    {
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        categoryId: uuid('category_id')
            .notNull()
            .references(() => categories.id, { onDelete: 'cascade' }),
    },
    (t) => [
        primaryKey({ columns: [t.productId, t.categoryId] }),
        index('idx_product_categories_category_id').on(t.categoryId),
    ],
);
