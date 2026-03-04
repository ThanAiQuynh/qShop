import { pgTable, uuid, varchar, primaryKey, index } from 'drizzle-orm/pg-core';
import { products } from './products.schema';

export const productFacets = pgTable(
    'product_facets',
    {
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        facetKey: varchar('facet_key', { length: 100 }).notNull(),
        facetValue: varchar('facet_value', { length: 255 }).notNull(),
    },
    (t) => [
        primaryKey({ columns: [t.productId, t.facetKey, t.facetValue] }),
        index('idx_product_facets_key_value').on(t.facetKey, t.facetValue),
    ],
);
