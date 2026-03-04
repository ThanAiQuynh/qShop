import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { productCategories } from './product-categories.schema';

export const categories = pgTable('categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    parentId: uuid('parent_id').references(() => categories.id, {
        onDelete: 'set null',
    }),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
    parent: one(categories, {
        fields: [categories.parentId],
        references: [categories.id],
        relationName: 'parent_child',
    }),
    children: many(categories, { relationName: 'parent_child' }),
    products: many(productCategories),
}));
