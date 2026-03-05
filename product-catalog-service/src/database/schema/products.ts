import { pgTable, serial, varchar, text, integer, pgEnum, timestamp } from 'drizzle-orm/pg-core';
import { brands } from './brands';

export const productStatusEnum = pgEnum('product_status', ['active', 'draft']);

export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    brandId: integer('brand_id')
        .notNull()
        .references(() => brands.id),
    description: text('description'),
    status: productStatusEnum('status').default('draft').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
});
