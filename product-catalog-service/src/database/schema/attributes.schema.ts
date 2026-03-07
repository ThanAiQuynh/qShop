import {
    pgTable,
    serial,
    varchar,
    timestamp,
    index,
    uniqueIndex,
} from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';

export const attributeTypeEnum = pgEnum('attribute_type', [
    'text',
    'number',
    'color',
    'boolean',
]);

// -----------------------------------------------------------------------
// attributes — Danh sách loại attribute (color, size, storage, ...)
// -----------------------------------------------------------------------
export const attributes = pgTable(
    'attributes',
    {
        id: serial('id').primaryKey(),
        name: varchar('name', { length: 255 }).notNull(),
        /** Mã định danh ngắn, ví dụ: "color", "size", "storage" */
        code: varchar('code', { length: 100 }).notNull(),
        type: attributeTypeEnum('type').notNull().default('text'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
        deletedAt: timestamp('deleted_at'),
    },
    (t) => [
        uniqueIndex('attributes_code_idx').on(t.code),
        index('attributes_deleted_at_idx').on(t.deletedAt),
    ],
);

// -----------------------------------------------------------------------
// attribute_values — Giá trị cụ thể của mỗi attribute
// Ví dụ: color → black, white; storage → 128GB, 256GB
// -----------------------------------------------------------------------
export const attributeValues = pgTable(
    'attribute_values',
    {
        id: serial('id').primaryKey(),
        attributeId: serial('attribute_id')
            .notNull()
            .references(() => attributes.id, { onDelete: 'cascade' }),
        value: varchar('value', { length: 255 }).notNull(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
        deletedAt: timestamp('deleted_at'),
    },
    (t) => [
        // Lấy các giá trị của một attribute (vd: tất cả màu sắc)
        index('attribute_values_attribute_id_idx').on(t.attributeId),
    ],
);

export type Attribute = typeof attributes.$inferSelect;
export type NewAttribute = typeof attributes.$inferInsert;
export type AttributeValue = typeof attributeValues.$inferSelect;
export type NewAttributeValue = typeof attributeValues.$inferInsert;
