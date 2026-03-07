import {
    pgTable,
    serial,
    varchar,
    text,
    integer,
    timestamp,
    index,
    uniqueIndex,
} from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';
import { brands } from './brands.schema';

export const productStatusEnum = pgEnum('product_status', ['active', 'draft']);

// -----------------------------------------------------------------------
// products — Bảng sản phẩm gốc (không lưu color/size/storage ở đây)
// -----------------------------------------------------------------------
export const products = pgTable(
    'products',
    {
        id: serial('id').primaryKey(),
        name: varchar('name', { length: 255 }).notNull(),
        slug: varchar('slug', { length: 255 }).notNull(),
        brandId: integer('brand_id').references(() => brands.id, {
            onDelete: 'set null',
        }),
        description: text('description'),
        status: productStatusEnum('status').notNull().default('draft'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
        deletedAt: timestamp('deleted_at'),
    },
    (t) => [
        uniqueIndex('products_slug_idx').on(t.slug),
        // Query phổ biến nhất: active products
        index('products_status_deleted_at_idx').on(t.status, t.deletedAt),
        // Lọc theo thương hiệu
        index('products_brand_id_status_idx').on(t.brandId, t.status),
    ],
);

// -----------------------------------------------------------------------
// product_images — Ảnh sản phẩm (product-level & variant-level)
// variant_id = NULL → ảnh chung; có giá trị → ảnh của variant đó
// -----------------------------------------------------------------------
export const productImages = pgTable(
    'product_images',
    {
        id: serial('id').primaryKey(),
        productId: integer('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        /** NULL = ảnh chung của product, có giá trị = ảnh riêng của variant */
        variantId: integer('variant_id'),
        url: varchar('url', { length: 1024 }).notNull(),
        altText: varchar('alt_text', { length: 255 }),
        position: integer('position').notNull().default(0),
        isPrimary: integer('is_primary').notNull().default(0), // 0 = false, 1 = true
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
        deletedAt: timestamp('deleted_at'),
    },
    (t) => [
        // Lấy ảnh theo product + variant (có NULL handling)
        index('product_images_product_variant_primary_idx').on(
            t.productId,
            t.variantId,
            t.isPrimary,
        ),
    ],
);

// -----------------------------------------------------------------------
// product_archives — Lưu sản phẩm đã bị Hard Delete (JSON snapshot)
// Dùng cho audit / khôi phục lịch sử sau khi xóa khỏi bảng chính
// -----------------------------------------------------------------------
export const productArchives = pgTable('product_archives', {
    id: serial('id').primaryKey(),
    originalProductId: integer('original_product_id').notNull(),
    /** Toàn bộ thông tin product được đóng gói thành JSON */
    dataJson: text('data_json').notNull(),
    deletedAt: timestamp('deleted_at').defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;
export type ProductArchive = typeof productArchives.$inferSelect;
export type NewProductArchive = typeof productArchives.$inferInsert;
