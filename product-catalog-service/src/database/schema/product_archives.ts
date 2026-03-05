import { pgTable, serial, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const productArchives = pgTable('product_archives', {
    id: serial('id').primaryKey(),
    originalProductId: integer('original_product_id').notNull(),
    dataJson: jsonb('data_json').notNull(),
    deletedAt: timestamp('deleted_at').defaultNow().notNull(),
});
