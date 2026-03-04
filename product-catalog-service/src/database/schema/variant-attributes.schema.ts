import { pgTable, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { productVariants } from './product-variants.schema';
import { attributeValues } from './attribute-values.schema';

export const variantAttributes = pgTable(
    'variant_attributes',
    {
        variantId: uuid('variant_id')
            .notNull()
            .references(() => productVariants.id, { onDelete: 'cascade' }),
        attributeValueId: uuid('attribute_value_id')
            .notNull()
            .references(() => attributeValues.id, { onDelete: 'cascade' }),
    },
    (t) => [primaryKey({ columns: [t.variantId, t.attributeValueId] })],
);
