import { pgTable, serial, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { attributes } from './attributes';

export const attributeValues = pgTable('attribute_values', {
    id: serial('id').primaryKey(),
    attributeId: integer('attribute_id')
        .notNull()
        .references(() => attributes.id),
    value: varchar('value', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
});
