import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const attributes = pgTable('attributes', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 100 }).notNull().unique(),
    type: varchar('type', { length: 50 }).notNull(), // e.g., 'text', 'select'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
});
