import { pgTable, serial, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { AnyPgColumn } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    parentId: integer('parent_id').references((): AnyPgColumn => categories.id),
    path: varchar('path', { length: 255 }).notNull(),
    depth: integer('depth').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
});
