import { pgTable, integer, varchar, index } from 'drizzle-orm/pg-core';
import { products } from './products';

export const productFacets = pgTable(
    'product_facets',
    {
        productId: integer('product_id')
            .notNull()
            .references(() => products.id),
        facetKey: varchar('facet_key', { length: 100 }).notNull(),
        facetValue: varchar('facet_value', { length: 255 }).notNull(),
    },
    (table) => [
        index('facet_key_value_idx').on(table.facetKey, table.facetValue),
    ],
);
