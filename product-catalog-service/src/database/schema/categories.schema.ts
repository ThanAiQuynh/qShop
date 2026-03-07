import {
    pgTable,
    serial,
    varchar,
    integer,
    timestamp,
    index,
    uniqueIndex,
    primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// -----------------------------------------------------------------------
// categories — Materialized Path tree
// Query all descendants: WHERE path LIKE '1/%'
// -----------------------------------------------------------------------
export const categories = pgTable(
    'categories',
    {
        id: serial('id').primaryKey(),
        name: varchar('name', { length: 255 }).notNull(),
        slug: varchar('slug', { length: 255 }).notNull(),
        /** NULL nếu là root category */
        parentId: integer('parent_id').references(() => categories.id, {
            onDelete: 'restrict',
        }),
        /** Materialized path, ví dụ: "1/5/12/" */
        path: varchar('path', { length: 1024 }).notNull().default(sql`''`),
        /** Cấp độ trong cây, root = 0 */
        depth: integer('depth').notNull().default(0),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
        deletedAt: timestamp('deleted_at'),
    },
    (t) => [
        uniqueIndex('categories_slug_idx').on(t.slug),
        // Truy vấn cây bằng LIKE '1/%'
        index('categories_path_idx').on(t.path),
        // Lấy danh mục theo cấp
        index('categories_depth_parent_idx').on(t.depth, t.parentId),
        index('categories_deleted_at_idx').on(t.deletedAt),
    ],
);

// -----------------------------------------------------------------------
// product_categories — many-to-many: product ↔ category
// -----------------------------------------------------------------------
export const productCategories = pgTable(
    'product_categories',
    {
        productId: integer('product_id').notNull(),
        categoryId: integer('category_id')
            .notNull()
            .references(() => categories.id, { onDelete: 'cascade' }),
    },
    (t) => [
        primaryKey({ columns: [t.productId, t.categoryId] }),
        index('product_categories_category_id_idx').on(t.categoryId),
        index('product_categories_product_id_idx').on(t.productId),
    ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;
