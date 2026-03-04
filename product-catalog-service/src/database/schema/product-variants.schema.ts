import {
    pgTable,
    uuid,
    varchar,
    decimal,
    timestamp,
    index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products.schema';
import { variantAttributes } from './variant-attributes.schema';
import { variantFlattened } from './variant-flattened.schema';

export const productVariants = pgTable(
    'product_variants',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        sku: varchar('sku', { length: 100 }).notNull().unique(),
        price: decimal('price', { precision: 15, scale: 2 }).notNull(),
        comparePrice: decimal('compare_price', { precision: 15, scale: 2 }),
        weight: decimal('weight', { precision: 10, scale: 3 }),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (t) => [index('idx_variants_product_id').on(t.productId)],
);

export const productVariantsRelations = relations(
    productVariants,
    ({ one, many }) => ({
        product: one(products, {
            fields: [productVariants.productId],
            references: [products.id],
        }),
        attributes: many(variantAttributes),
        flattened: one(variantFlattened, {
            fields: [productVariants.id],
            references: [variantFlattened.variantId],
        }),
    }),
);
