import {
    pgTable,
    pgEnum,
    uuid,
    varchar,
    text,
    timestamp,
    index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { brands } from './brands.schema';
import { productVariants } from './product-variants.schema';
import { productImages } from './product-images.schema';
import { productCategories } from './product-categories.schema';
import { productFacets } from './product-facets.schema';
import { productFilterIndex } from './product-filter-index.schema';

export const productStatusEnum = pgEnum('product_status', ['active', 'draft']);

export const products = pgTable(
    'products',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        name: varchar('name', { length: 255 }).notNull(),
        slug: varchar('slug', { length: 255 }).notNull().unique(),
        brandId: uuid('brand_id').references(() => brands.id, {
            onDelete: 'set null',
        }),
        description: text('description'),
        status: productStatusEnum('status').default('draft').notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (t) => [
        index('idx_products_slug').on(t.slug),
        index('idx_products_brand_id').on(t.brandId),
    ],
);

export const productsRelations = relations(products, ({ one, many }) => ({
    brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
    variants: many(productVariants),
    images: many(productImages),
    categories: many(productCategories),
    facets: many(productFacets),
    filterIndex: one(productFilterIndex, {
        fields: [products.id],
        references: [productFilterIndex.productId],
    }),
}));
