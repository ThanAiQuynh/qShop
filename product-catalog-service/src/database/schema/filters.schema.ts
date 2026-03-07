import {
    pgTable,
    serial,
    varchar,
    numeric,
    integer,
    timestamp,
    index,
} from 'drizzle-orm/pg-core';
import { products } from './products.schema';
import { categories } from './categories.schema';

// -----------------------------------------------------------------------
// product_facets — Dùng cho faceted search (key-value pairs)
// Dữ liệu được denormalize từ variant_attributes để tăng tốc filter
// -----------------------------------------------------------------------
export const productFacets = pgTable(
    'product_facets',
    {
        id: serial('id').primaryKey(),
        productId: integer('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        facetKey: varchar('facet_key', { length: 100 }).notNull(),
        facetValue: varchar('facet_value', { length: 255 }).notNull(),
    },
    (t) => [
        index('product_facets_product_id_key_idx').on(t.productId, t.facetKey),
        index('product_facets_key_value_idx').on(t.facetKey, t.facetValue),
    ],
);

// -----------------------------------------------------------------------
// product_filter_index — Materialized filter table
// Được populate bằng ETL job để phục vụ query filter cực nhanh:
//   WHERE category = phone AND color = black AND price < 30_000_000
// -----------------------------------------------------------------------
export const productFilterIndex = pgTable(
    'product_filter_index',
    {
        id: serial('id').primaryKey(),
        productId: integer('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        categoryId: integer('category_id')
            .notNull()
            .references(() => categories.id, { onDelete: 'cascade' }),
        minPrice: numeric('min_price', { precision: 15, scale: 2 }),
        maxPrice: numeric('max_price', { precision: 15, scale: 2 }),
        /** Giá trị màu sắc, ví dụ: "black,white,gold" */
        colors: varchar('colors', { length: 512 }),
        /** Giá trị kích cỡ, ví dụ: "S,M,L,XL" */
        sizes: varchar('sizes', { length: 512 }),
        /** Giá trị bộ nhớ, ví dụ: "128GB,256GB,512GB" */
        storages: varchar('storages', { length: 512 }),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (t) => [
        // Query nặng nhất: category + khoảng giá
        index('product_filter_index_category_price_idx').on(
            t.categoryId,
            t.minPrice,
            t.maxPrice,
        ),
        index('product_filter_index_product_id_idx').on(t.productId),
    ],
);

export type ProductFacet = typeof productFacets.$inferSelect;
export type NewProductFacet = typeof productFacets.$inferInsert;
export type ProductFilterIndex = typeof productFilterIndex.$inferSelect;
export type NewProductFilterIndex = typeof productFilterIndex.$inferInsert;
