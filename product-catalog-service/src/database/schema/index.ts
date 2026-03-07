/**
 * Schema barrel export
 *
 * Nhóm các bảng theo chức năng:
 *  - brands            → brands
 *  - products          → products, product_images, product_archives
 *  - categories        → categories, product_categories
 *  - attributes        → attributes, attribute_values
 *  - variants          → product_variants, variant_attributes, variant_flattened
 *  - filters           → product_facets, product_filter_index
 *  - price-history     → price_history
 */

export * from './brands.schema';
export * from './products.schema';
export * from './categories.schema';
export * from './attributes.schema';
export * from './variants.schema';
export * from './filters.schema';
export * from './price-history.schema';
