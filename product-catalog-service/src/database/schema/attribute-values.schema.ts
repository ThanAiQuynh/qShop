import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { attributes } from './attributes.schema';
import { variantAttributes } from './variant-attributes.schema';

export const attributeValues = pgTable('attribute_values', {
    id: uuid('id').primaryKey().defaultRandom(),
    attributeId: uuid('attribute_id')
        .notNull()
        .references(() => attributes.id, { onDelete: 'cascade' }),
    value: varchar('value', { length: 255 }).notNull(),
});

export const attributeValuesRelations = relations(
    attributeValues,
    ({ one, many }) => ({
        attribute: one(attributes, {
            fields: [attributeValues.attributeId],
            references: [attributes.id],
        }),
        variantAttributes: many(variantAttributes),
    }),
);
