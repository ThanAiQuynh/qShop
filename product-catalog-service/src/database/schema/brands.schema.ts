import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products.schema';

export const brands = pgTable('brands', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    logo: varchar('logo', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const brandsRelations = relations(brands, ({ many }) => ({
    products: many(products),
}));
