/**
 * Seed script — 1,000,000 product_variants
 *
 * Phân bố records:
 *   brands               :      50
 *   categories           :     210  (10 root / 50 L1 / 150 L2)
 *   attributes           :       4
 *   attribute_values     :      27
 *   products             : 100,000
 *   product_categories   : ~130,000
 *   product_variants     : 1,000,000  ← mục tiêu chính
 *   variant_attributes   : 3,000,000
 *   variant_flattened    : 1,000,000
 *   product_images       :   300,000
 *   product_facets       :  ~200,000
 *   product_filter_index :  ~130,000
 *   price_history        : 1,000,000
 *
 * Run: npm run db:seed  (hoặc pnpm db:seed)
 * Ước tính thời gian: 15-40 phút tuỳ phần cứng
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { faker } from '@faker-js/faker';

import {
    brands as brandsTable,
    categories as categoriesTable,
    attributes as attributesTable,
    attributeValues as attributeValuesTable,
    products as productsTable,
    productCategories as productCategoriesTable,
    productVariants as productVariantsTable,
    variantAttributes as variantAttributesTable,
    variantFlattened as variantFlattenedTable,
    productImages as productImagesTable,
    productFacets as productFacetsTable,
    productFilterIndex as productFilterIndexTable,
    priceHistory as priceHistoryTable,
} from './schema';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const BRAND_COUNT = 50;
const PRODUCT_COUNT = 100_000;
const VARIANTS_PER_PRODUCT = 10; // → 1,000,000 variants
const ROOT_CATS = 10;
const L1_PER_ROOT = 5;
const L2_PER_L1 = 3;
const PRODUCT_BATCH = 1_000; // products per iteration
const INSERT_CHUNK = 2_000; // rows per INSERT statement

// Attribute value pools
const COLORS = ['black', 'white', 'red', 'blue', 'green', 'gold', 'silver', 'purple', 'orange', 'pink'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const STORAGES = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'];
const MATERIALS = ['cotton', 'polyester', 'leather', 'nylon', 'wool'];

// ─── DB ──────────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const db = drizzle(pool);

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function chunk<T>(arr: T[], size: number): T[][] {
    const r: T[][] = [];
    for (let i = 0; i < arr.length; i += size) r.push(arr.slice(i, i + size));
    return r;
}

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
    return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

async function bulkInsert<T extends Record<string, unknown>>(
    table: any,
    rows: T[],
    size = INSERT_CHUNK,
): Promise<void> {
    if (!rows.length) return;
    for (const b of chunk(rows, size)) {
        await db.insert(table).values(b).onConflictDoNothing();
    }
}

async function bulkInsertRet<T extends Record<string, unknown>, R>(
    table: any,
    rows: T[],
    fields: Record<string, any>,
    size = INSERT_CHUNK,
): Promise<R[]> {
    if (!rows.length) return [];
    const result: R[] = [];
    for (const b of chunk(rows, size)) {
        const ret = (await db.insert(table).values(b).returning(fields)) as R[];
        result.push(...ret);
    }
    return result;
}

function price(min: number, max: number) {
    return (Math.random() * (max - min) + min).toFixed(2);
}

function log(msg: string) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ─── ATTRIBUTE VALUE MAP ──────────────────────────────────────────────────────
interface AttrVal { id: number; value: string }
interface AttrMap { color: AttrVal[]; size: AttrVal[]; storage: AttrVal[]; material: AttrVal[] }

// ─── SEED FUNCTIONS ───────────────────────────────────────────────────────────

async function seedBrands(): Promise<number[]> {
    log(`Seeding ${BRAND_COUNT} brands…`);
    const rows = Array.from({ length: BRAND_COUNT }, (_, i) => ({
        name: `${faker.company.name()} ${i}`,
        slug: `brand-${i + 1}`,
        logo: `https://picsum.photos/seed/b${i}/200/200`,
    }));
    const ret = await bulkInsertRet<typeof rows[number], { id: number }>(
        brandsTable, rows, { id: brandsTable.id },
    );
    log(`  ✓ ${ret.length} brands`);
    return ret.map(r => r.id);
}

async function seedCategories(): Promise<{ allIds: number[]; leafIds: number[] }> {
    log('Seeding categories (3-level tree)…');
    const allIds: number[] = [];
    const leafIds: number[] = [];

    for (let r = 0; r < ROOT_CATS; r++) {
        const [root] = await db.insert(categoriesTable).values({
            name: faker.commerce.department(),
            slug: `cat-root-${r + 1}`,
            parentId: null,
            path: 'tmp',
            depth: 0,
        }).returning({ id: categoriesTable.id });

        await db.update(categoriesTable)
            .set({ path: `${root.id}/` })
            .where(eq(categoriesTable.id, root.id));
        allIds.push(root.id);

        for (let l = 0; l < L1_PER_ROOT; l++) {
            const [l1] = await db.insert(categoriesTable).values({
                name: `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
                slug: `cat-l1-${r + 1}-${l + 1}`,
                parentId: root.id,
                path: 'tmp',
                depth: 1,
            }).returning({ id: categoriesTable.id });

            const l1Path = `${root.id}/${l1.id}/`;
            await db.update(categoriesTable)
                .set({ path: l1Path })
                .where(eq(categoriesTable.id, l1.id));
            allIds.push(l1.id);

            for (let k = 0; k < L2_PER_L1; k++) {
                const [l2] = await db.insert(categoriesTable).values({
                    name: faker.commerce.productName(),
                    slug: `cat-l2-${l1.id}-${k + 1}`,
                    parentId: l1.id,
                    path: 'tmp',
                    depth: 2,
                }).returning({ id: categoriesTable.id });

                await db.update(categoriesTable)
                    .set({ path: `${root.id}/${l1.id}/${l2.id}/` })
                    .where(eq(categoriesTable.id, l2.id));
                allIds.push(l2.id);
                leafIds.push(l2.id);
            }
        }
    }

    log(`  ✓ ${allIds.length} categories (${leafIds.length} leaves)`);
    return { allIds, leafIds };
}

async function seedAttributes(): Promise<AttrMap> {
    log('Seeding attributes & values…');
    const defs = [
        { name: 'Color', code: 'color', type: 'color' as const, vals: COLORS },
        { name: 'Size', code: 'size', type: 'text' as const, vals: SIZES },
        { name: 'Storage', code: 'storage', type: 'text' as const, vals: STORAGES },
        { name: 'Material', code: 'material', type: 'text' as const, vals: MATERIALS },
    ];

    const map: AttrMap = { color: [], size: [], storage: [], material: [] };

    for (const def of defs) {
        const [attr] = await db.insert(attributesTable).values({
            name: def.name, code: def.code, type: def.type,
        }).returning({ id: attributesTable.id });

        const valRows = def.vals.map(v => ({ attributeId: attr.id, value: v }));
        const inserted = await bulkInsertRet<typeof valRows[number], { id: number; value: string }>(
            attributeValuesTable, valRows, { id: attributeValuesTable.id, value: attributeValuesTable.value },
        );
        (map as any)[def.code] = inserted;
    }

    log(`  ✓ ${defs.length} attributes`);
    return map;
}

async function seedProducts(
    brandIds: number[],
    leafCategoryIds: number[],
    attrMap: AttrMap,
): Promise<void> {
    const totalBatches = Math.ceil(PRODUCT_COUNT / PRODUCT_BATCH);
    let done = 0;

    for (let b = 0; b < totalBatches; b++) {
        const batchSize = Math.min(PRODUCT_BATCH, PRODUCT_COUNT - done);
        const offset = done;

        // ── 1. Products ──────────────────────────────────────────────────────────
        const productRows = Array.from({ length: batchSize }, (_, i) => {
            const idx = offset + i;
            return {
                name: `${faker.commerce.productName()} ${idx}`,
                slug: `product-${idx + 1}`,
                brandId: pick(brandIds),
                description: faker.commerce.productDescription(),
                status: 'active' as const,
            };
        });

        const insertedProducts = await bulkInsertRet<typeof productRows[number], { id: number }>(
            productsTable, productRows, { id: productsTable.id },
        );
        const productIds = insertedProducts.map(p => p.id);

        // ── 2. Product Categories (1–2 leaves per product) ───────────────────────
        const pcRows: { productId: number; categoryId: number }[] = [];
        const seenPairs = new Set<string>();

        for (const productId of productIds) {
            const numCats = Math.random() < 0.3 ? 2 : 1;
            for (const categoryId of pickN(leafCategoryIds, numCats)) {
                const key = `${productId}:${categoryId}`;
                if (!seenPairs.has(key)) {
                    seenPairs.add(key);
                    pcRows.push({ productId, categoryId });
                }
            }
        }
        await bulkInsert(productCategoriesTable, pcRows);

        // ── 3. Variants (10 per product) ─────────────────────────────────────────
        interface VMeta {
            productId: number; id: number;
            color: AttrVal; size: AttrVal; storage: AttrVal;
            price: string; comparePrice: string;
        }

        const variantRows = productIds.flatMap((productId, pi) =>
            Array.from({ length: VARIANTS_PER_PRODUCT }, (_, vi) => ({
                productId,
                sku: `P${productId}V${vi}-${b}${pi}${vi}${Math.random().toString(36).slice(2, 6)}`,
                price: price(50_000, 30_000_000),
                comparePrice: price(30_000_000, 40_000_000),
                weight: (Math.random() * 3 + 0.1).toFixed(3),
            })),
        );

        const insertedVariants = await bulkInsertRet<typeof variantRows[number], { id: number; productId: number; price: string }>(
            productVariantsTable, variantRows,
            { id: productVariantsTable.id, productId: productVariantsTable.productId, price: productVariantsTable.price },
        );

        // Enrich with attribute choices
        const vMetas: VMeta[] = insertedVariants.map(v => ({
            id: v.id,
            productId: v.productId,
            price: v.price,
            comparePrice: price(parseFloat(v.price) * 1.1, parseFloat(v.price) * 1.3),
            color: pick(attrMap.color),
            size: pick(attrMap.size),
            storage: pick(attrMap.storage),
        }));

        // ── 4. Variant Attributes ─────────────────────────────────────────────────
        const vaRows = vMetas.flatMap(v => [
            { variantId: v.id, attributeValueId: v.color.id },
            { variantId: v.id, attributeValueId: v.size.id },
            { variantId: v.id, attributeValueId: v.storage.id },
        ]);
        await bulkInsert(variantAttributesTable, vaRows);

        // ── 5. Variant Flattened ──────────────────────────────────────────────────
        const vfRows = vMetas.map(v => ({
            variantId: v.id,
            productId: v.productId,
            color: v.color.value,
            size: v.size.value,
            storage: v.storage.value,
            price: v.price,
        }));
        await bulkInsert(variantFlattenedTable, vfRows);

        // ── 6. Product Images (3 per product) ────────────────────────────────────
        const imgRows = productIds.flatMap(productId => [
            { productId, variantId: null, url: `https://picsum.photos/seed/${productId}a/800/600`, altText: `Product ${productId} image 1`, position: 0, isPrimary: 1 },
            { productId, variantId: null, url: `https://picsum.photos/seed/${productId}b/800/600`, altText: `Product ${productId} image 2`, position: 1, isPrimary: 0 },
            { productId, variantId: null, url: `https://picsum.photos/seed/${productId}c/800/600`, altText: `Product ${productId} image 3`, position: 2, isPrimary: 0 },
        ]);
        await bulkInsert(productImagesTable, imgRows);

        // ── 7. Product Facets ─────────────────────────────────────────────────────
        // Group variants by product for aggregation
        const vByProduct = new Map<number, VMeta[]>();
        for (const v of vMetas) {
            if (!vByProduct.has(v.productId)) vByProduct.set(v.productId, []);
            vByProduct.get(v.productId)!.push(v);
        }

        const facetRows = productIds.flatMap(productId => {
            const pvs = vByProduct.get(productId) ?? [];
            const uniqColors = [...new Set(pvs.map(v => v.color.value))];
            const uniqSizes = [...new Set(pvs.map(v => v.size.value))];
            const uniqStorages = [...new Set(pvs.map(v => v.storage.value))];
            return [
                ...uniqColors.map(val => ({ productId, facetKey: 'color', facetValue: val })),
                ...uniqSizes.map(val => ({ productId, facetKey: 'size', facetValue: val })),
                ...uniqStorages.map(val => ({ productId, facetKey: 'storage', facetValue: val })),
            ];
        });
        await bulkInsert(productFacetsTable, facetRows);

        // ── 8. Product Filter Index ───────────────────────────────────────────────
        const filterRows = pcRows.map(pc => {
            const pvs = vByProduct.get(pc.productId) ?? [];
            const prices = pvs.map(v => parseFloat(v.price));
            return {
                productId: pc.productId,
                categoryId: pc.categoryId,
                minPrice: Math.min(...prices).toFixed(2),
                maxPrice: Math.max(...prices).toFixed(2),
                colors: [...new Set(pvs.map(v => v.color.value))].join(','),
                sizes: [...new Set(pvs.map(v => v.size.value))].join(','),
                storages: [...new Set(pvs.map(v => v.storage.value))].join(','),
            };
        });
        await bulkInsert(productFilterIndexTable, filterRows);

        // ── 9. Price History (1 per variant = initial record) ────────────────────
        const phRows = vMetas.map(v => ({
            variantId: v.id,
            oldPrice: v.comparePrice,
            newPrice: v.price,
            changedBy: 'system',
            changedAt: new Date(),
        }));
        await bulkInsert(priceHistoryTable, phRows);

        done += batchSize;
        const pct = ((done / PRODUCT_COUNT) * 100).toFixed(1);
        log(`  Batch ${b + 1}/${totalBatches} — ${done.toLocaleString()} products (${pct}%) | ~${(done * VARIANTS_PER_PRODUCT).toLocaleString()} variants`);
    }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
    log('🚀 Starting seed — target: 1,000,000 product_variants');
    const t0 = Date.now();

    try {
        const brandIds = await seedBrands();
        const { leafIds: leafCategoryIds } = await seedCategories();
        const attrMap = await seedAttributes();
        await seedProducts(brandIds, leafCategoryIds, attrMap);

        const elapsed = ((Date.now() - t0) / 1000 / 60).toFixed(1);
        log(`\n✅ Seed complete in ${elapsed} min`);
        log(`   products        : ${PRODUCT_COUNT.toLocaleString()}`);
        log(`   variants (1M)   : ${(PRODUCT_COUNT * VARIANTS_PER_PRODUCT).toLocaleString()}`);
    } catch (err) {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
