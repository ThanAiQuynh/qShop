import {
    pgTable,
    serial,
    varchar,
    numeric,
    integer,
    timestamp,
    index,
    uniqueIndex,
    primaryKey,
} from 'drizzle-orm/pg-core';
import { products } from './products.schema';
import { attributeValues } from './attributes.schema';

// -----------------------------------------------------------------------
// product_variants — Mỗi variant là một SKU cụ thể
// Ví dụ: iPhone 15, màu đen, 128GB → IP15-128-BLK
// -----------------------------------------------------------------------
export const productVariants = pgTable(
    'product_variants',
    {
        id: serial('id').primaryKey(),
        productId: integer('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        sku: varchar('sku', { length: 100 }).notNull(),
        price: numeric('price', { precision: 15, scale: 2 }).notNull(),
        comparePrice: numeric('compare_price', { precision: 15, scale: 2 }),
        weight: numeric('weight', { precision: 10, scale: 3 }),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
        deletedAt: timestamp('deleted_at'),
    },
    (t) => [
        uniqueIndex('product_variants_sku_idx').on(t.sku),
        // Lấy tất cả variant của product (kể cả soft-delete check)
        index('product_variants_product_id_deleted_at_idx').on(
            t.productId,
            t.deletedAt,
        ),
        // Lọc theo khoảng giá
        index('product_variants_price_idx').on(t.price),
    ],
);

// -----------------------------------------------------------------------
// variant_attributes — Mapping variant ↔ attribute values (composite PK)
// Ví dụ: variant 1 → black (attributeValue 1), 128GB (attributeValue 3)
// -----------------------------------------------------------------------
export const variantAttributes = pgTable(
    'variant_attributes',
    {
        variantId: integer('variant_id')
            .notNull()
            .references(() => productVariants.id, { onDelete: 'cascade' }),
        attributeValueId: integer('attribute_value_id')
            .notNull()
            .references(() => attributeValues.id, { onDelete: 'cascade' }),
    },
    (t) => [
        primaryKey({ columns: [t.variantId, t.attributeValueId] }),
        // Lấy tất cả attribute của một variant
        index('variant_attributes_variant_id_idx').on(t.variantId),
        // Reverse lookup: attribute_value → variants
        index('variant_attributes_attribute_value_id_idx').on(t.attributeValueId),
    ],
);

// -----------------------------------------------------------------------
// variant_flattened — Bảng flatten cho search & filter nhanh
// Được populate bằng ETL job, không write trực tiếp từ API
// -----------------------------------------------------------------------
export const variantFlattened = pgTable(
    'variant_flattened',
    {
        variantId: integer('variant_id')
            .notNull()
            .references(() => productVariants.id, { onDelete: 'cascade' }),
        productId: integer('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        color: varchar('color', { length: 100 }),
        size: varchar('size', { length: 100 }),
        storage: varchar('storage', { length: 100 }),
        price: numeric('price', { precision: 15, scale: 2 }).notNull(),
    },
    (t) => [
        // Composite: tìm listing với color và price
        index('variant_flattened_product_color_price_idx').on(
            t.productId,
            t.color,
            t.price,
        ),
        index('variant_flattened_color_idx').on(t.color),
        index('variant_flattened_storage_idx').on(t.storage),
        index('variant_flattened_size_idx').on(t.size),
        index('variant_flattened_price_idx').on(t.price),
    ],
);

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type VariantAttribute = typeof variantAttributes.$inferSelect;
export type NewVariantAttribute = typeof variantAttributes.$inferInsert;
export type VariantFlattened = typeof variantFlattened.$inferSelect;
export type NewVariantFlattened = typeof variantFlattened.$inferInsert;
