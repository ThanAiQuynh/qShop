import { pgTable, pgEnum, uuid, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { attributeValues } from './attribute-values.schema';

export const attributeTypeEnum = pgEnum('attribute_type', [
    'text',
    'number',
    'boolean',
    'color',
]);

export const attributes = pgTable('attributes', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 100 }).notNull().unique(),
    type: attributeTypeEnum('type').default('text').notNull(),
});

export const attributesRelations = relations(attributes, ({ many }) => ({
    values: many(attributeValues),
}));
