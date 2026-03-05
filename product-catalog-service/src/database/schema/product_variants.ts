import { pgTable, serial, varchar, integer, decimal, timestamp } from 'drizzle-orm/pg-core';
import { products } from './products';

export const productVariants = pgTable('product_variants', {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
        .notNull()
        .references(() => products.id),
    sku: varchar('sku', { length: 255 }).notNull().unique(),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    comparePrice: decimal('compare_price', { precision: 12, scale: 2 }),
    weight: decimal('weight', { precision: 12, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
});
