import { pgTable, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const productArchives = pgTable('product_archives', {
    id: uuid('id').primaryKey().defaultRandom(),
    originalProductId: uuid('original_product_id').notNull(),
    dataJson: jsonb('data_json').notNull(),
    deletedAt: timestamp('deleted_at').defaultNow().notNull(),
});
