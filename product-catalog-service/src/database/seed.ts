import 'dotenv/config';
import { db } from './db';
import * as schema from './schema';
import { ProductStatus } from '../common/constants/product-status.enum';

async function main() {
    console.log('--- Bắt đầu seed dữ liệu mở rộng ---');

    // Clean up before seeding (Optional, but useful for clean seed)
    // await db.delete(schema.priceHistory);
    // await db.delete(schema.variantFlattened);
    // ... (Add more if needed)

    // 1. Seed Brands
    console.log('Seeding brands...');
    const brandsData = [
        { name: 'Apple', slug: 'apple', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' },
        { name: 'Samsung', slug: 'samsung', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg' },
        { name: 'Sony', slug: 'sony', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg' },
        { name: 'LG', slug: 'lg', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/LG_logo_%282015%29.svg' },
        { name: 'Dell', slug: 'dell', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Dell_logo_2016.svg' },
    ];
    await db.insert(schema.brands).values(brandsData).onConflictDoNothing();
    const allBrands = await db.select().from(schema.brands);

    // 2. Seed Categories
    console.log('Seeding categories...');
    const categoriesData = [
        { name: 'Điện thoại', slug: 'dien-thoai', path: 'dien-thoai', depth: 0 },
        { name: 'Laptop', slug: 'laptop', path: 'laptop', depth: 0 },
        { name: 'Phụ kiện', slug: 'phu-kien', path: 'phu-kien', depth: 0 },
    ];
    await db.insert(schema.categories).values(categoriesData).onConflictDoNothing();
    const allCategories = await db.select().from(schema.categories);

    // 3. Seed Attributes
    console.log('Seeding attributes...');
    const attributesData = [
        { name: 'Màu sắc', code: 'color', type: 'select' },
        { name: 'Dung lượng', code: 'storage', type: 'select' },
        { name: 'Kích thước màn hình', code: 'screen_size', type: 'text' },
    ];
    await db.insert(schema.attributes).values(attributesData).onConflictDoNothing();
    const allAttributes = await db.select().from(schema.attributes);

    // 4. Seed Attribute Values
    console.log('Seeding attribute values...');
    const colorAttr = allAttributes.find(a => a.code === 'color');
    const storageAttr = allAttributes.find(a => a.code === 'storage');

    if (colorAttr && storageAttr) {
        const attributeValuesData = [
            { attributeId: colorAttr.id, value: 'Đen' },
            { attributeId: colorAttr.id, value: 'Trắng' },
            { attributeId: colorAttr.id, value: 'Xanh' },
            { attributeId: storageAttr.id, value: '128GB' },
            { attributeId: storageAttr.id, value: '256GB' },
            { attributeId: storageAttr.id, value: '512GB' },
        ];
        await db.insert(schema.attributeValues).values(attributeValuesData).onConflictDoNothing();
    }
    const allAttributeValues = await db.select().from(schema.attributeValues);

    // 5. Seed Products
    console.log('Seeding products...');
    const apple = allBrands.find(b => b.slug === 'apple');
    const samsung = allBrands.find(b => b.slug === 'samsung');

    if (apple && samsung) {
        const productsData = [
            {
                name: 'iPhone 15 Pro',
                slug: 'iphone-15-pro',
                brandId: apple.id,
                description: 'iPhone 15 Pro mới nhất từ Apple với khung Titan siêu bền.',
                status: ProductStatus.ACTIVE,
            },
            {
                name: 'Samsung Galaxy S24 Ultra',
                slug: 'samsung-galaxy-s24-ultra',
                brandId: samsung.id,
                description: 'Đỉnh cao công nghệ AI trên Samsung Galaxy S24 Ultra.',
                status: ProductStatus.ACTIVE,
            },
        ];
        await db.insert(schema.products).values(productsData).onConflictDoNothing();
    }
    const allProducts = await db.select().from(schema.products);

    // 6. Seed Product Categories
    console.log('Seeding product categories...');
    const phoneCat = allCategories.find(c => c.slug === 'dien-thoai');
    if (phoneCat) {
        const productCategoriesData = allProducts.map(p => ({
            productId: p.id,
            categoryId: phoneCat.id,
        }));
        await db.insert(schema.productCategories).values(productCategoriesData).onConflictDoNothing();
    }

    // 7. Seed Product Variants
    console.log('Seeding product variants...');
    const iphone = allProducts.find(p => p.slug === 'iphone-15-pro');
    const s24 = allProducts.find(p => p.slug === 'samsung-galaxy-s24-ultra');

    if (iphone && s24) {
        const variantsData = [
            { productId: iphone.id, sku: 'IP15P-128-BLACK', price: '28990000', weight: '0.187' },
            { productId: iphone.id, sku: 'IP15P-256-BLACK', price: '31990000', weight: '0.187' },
            { productId: s24.id, sku: 'S24U-256-GRAY', price: '29990000', weight: '0.232' },
        ];
        await db.insert(schema.productVariants).values(variantsData).onConflictDoNothing();
    }
    const allVariants = await db.select().from(schema.productVariants);

    // 8. Seed Variant Attributes
    console.log('Seeding variant attributes...');
    const blackVal = allAttributeValues.find(v => v.value === 'Đen');
    const storage128Val = allAttributeValues.find(v => v.value === '128GB');
    const storage256Val = allAttributeValues.find(v => v.value === '256GB');
    const v_ip128 = allVariants.find(v => v.sku === 'IP15P-128-BLACK');
    const v_ip256 = allVariants.find(v => v.sku === 'IP15P-256-BLACK');

    if (v_ip128 && blackVal && storage128Val) {
        await db.insert(schema.variantAttributes).values([
            { variantId: v_ip128.id, attributeValueId: blackVal.id },
            { variantId: v_ip128.id, attributeValueId: storage128Val.id },
        ]).onConflictDoNothing();
    }
    if (v_ip256 && blackVal && storage256Val) {
        await db.insert(schema.variantAttributes).values([
            { variantId: v_ip256.id, attributeValueId: blackVal.id },
            { variantId: v_ip256.id, attributeValueId: storage256Val.id },
        ]).onConflictDoNothing();
    }

    // 9. Seed Product Images
    console.log('Seeding product images...');
    if (iphone) {
        await db.insert(schema.productImages).values([
            { productId: iphone.id, url: 'https://example.com/iphone15-pro-primary.jpg', altText: 'iPhone 15 Pro Primary', isPrimary: true, position: 1 },
            { productId: iphone.id, url: 'https://example.com/iphone15-pro-side.jpg', altText: 'iPhone 15 Pro Side View', isPrimary: false, position: 2 },
        ]).onConflictDoNothing();
    }

    // 10. Seed Product Facets
    console.log('Seeding product facets...');
    if (iphone) {
        await db.insert(schema.productFacets).values([
            { productId: iphone.id, facetKey: 'Brand', facetValue: 'Apple' },
            { productId: iphone.id, facetKey: 'Màu sắc', facetValue: 'Đen' },
            { productId: iphone.id, facetKey: 'Dung lượng', facetValue: '128GB' },
            { productId: iphone.id, facetKey: 'Dung lượng', facetValue: '256GB' },
        ]).onConflictDoNothing();
    }

    // 11. Seed Product Filter Index
    console.log('Seeding product filter index...');
    if (iphone && phoneCat) {
        await db.insert(schema.productFilterIndex).values([
            {
                productId: iphone.id,
                categoryId: phoneCat.id,
                minPrice: '28990000',
                maxPrice: '31990000',
                colors: ['Đen'],
                storages: ['128GB', '256GB'],
            }
        ]).onConflictDoNothing();
    }

    // 12. Seed Variant Flattened
    console.log('Seeding variant flattened...');
    if (v_ip128 && iphone) {
        await db.insert(schema.variantFlattened).values({
            variantId: v_ip128.id,
            productId: iphone.id,
            color: 'Đen',
            storage: '128GB',
            price: v_ip128.price,
        }).onConflictDoNothing();
    }
    if (v_ip256 && iphone) {
        await db.insert(schema.variantFlattened).values({
            variantId: v_ip256.id,
            productId: iphone.id,
            color: 'Đen',
            storage: '256GB',
            price: v_ip256.price,
        }).onConflictDoNothing();
    }

    // 13. Seed Price History
    console.log('Seeding price history...');
    if (v_ip128) {
        await db.insert(schema.priceHistory).values({
            variantId: v_ip128.id,
            oldPrice: '29990000', // Giảm giá từ 29.99 xuống 28.99
            newPrice: v_ip128.price,
            changedBy: 'system_seed',
        }).onConflictDoNothing();
    }

    console.log('--- Seed dữ liệu mở rộng hoàn tất! ---');
    process.exit(0);
}

main().catch((err) => {
    console.error('Lỗi khi seed dữ liệu:', err);
    process.exit(1);
});
