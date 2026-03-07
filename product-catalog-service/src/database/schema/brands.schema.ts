import {
    pgTable,
    serial,
    varchar,
    timestamp,
    index,
    uniqueIndex,
} from 'drizzle-orm/pg-core';

export const brands = pgTable(
    'brands',
    {
        id: serial('id').primaryKey(),
        name: varchar('name', { length: 255 }).notNull(),
        slug: varchar('slug', { length: 255 }).notNull(),
        logo: varchar('logo', { length: 512 }),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
        deletedAt: timestamp('deleted_at'),
    },
    (t) => [
        uniqueIndex('brands_slug_idx').on(t.slug),
        index('brands_deleted_at_idx').on(t.deletedAt),
    ],
);

export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
