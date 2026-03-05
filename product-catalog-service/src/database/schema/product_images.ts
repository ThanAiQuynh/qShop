import { pgTable, serial, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { products } from './products';
import { productVariants } from './product_variants';

export const productImages = pgTable('product_images', {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
        .notNull()
        .references(() => products.id),
    variantId: integer('variant_id').references(() => productVariants.id),
    url: text('url').notNull(),
    altText: varchar('alt_text', { length: 255 }),
    position: integer('position').default(0).notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
});
