import { pgTable, uuid, varchar, integer, boolean } from 'drizzle-orm/pg-core';
import { products } from './products.schema';

export const productImages = pgTable('product_images', {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
        .notNull()
        .references(() => products.id, { onDelete: 'cascade' }),
    url: varchar('url', { length: 500 }).notNull(),
    position: integer('position').default(0).notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
});
