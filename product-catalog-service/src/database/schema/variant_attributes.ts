import { pgTable, integer, primaryKey } from 'drizzle-orm/pg-core';
import { productVariants } from './product_variants';
import { attributeValues } from './attribute_values';

export const variantAttributes = pgTable(
    'variant_attributes',
    {
        variantId: integer('variant_id')
            .notNull()
            .references(() => productVariants.id),
        attributeValueId: integer('attribute_value_id')
            .notNull()
            .references(() => attributeValues.id),
    },
    (table) => [
        primaryKey({ columns: [table.variantId, table.attributeValueId] }),
    ],
);
