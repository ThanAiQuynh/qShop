import { Injectable } from '@nestjs/common';
import { db, schema } from '../../../../database/db';

@Injectable()
export class ProductFacetRepository {

    // ═══════════════════════════════════════════════════════════════
    //  FACETS — Bảng product_facets
    // ═══════════════════════════════════════════════════════════════

    /** Đếm facets cho sidebar filter — GROUP BY facet_key, facet_value */
    async countFacets(productIds?: number[]) {
        // TODO: SELECT facet_key, facet_value, count(*)
        //       FROM product_facets
        //       [WHERE product_id IN (...)]
        //       GROUP BY facet_key, facet_value
        //       → return { [key]: [{ value, count }] }
    }

    /** Lọc products theo facet — dùng product_facets_key_value_idx */
    async findProductIdsByFacets(facetKey: string, facetValue: string) {
        // TODO: SELECT product_id WHERE facet_key = ? AND facet_value = ?
    }

    // ═══════════════════════════════════════════════════════════════
    //  FILTER INDEX — Bảng product_filter_index (denormalized)
    // ═══════════════════════════════════════════════════════════════

    /** Filter nặng: category + price range — dùng product_filter_index_category_price_idx */
    async findProductIdsByFilterIndex(categoryId: number, minPrice?: number, maxPrice?: number) {
        // TODO: SELECT product_id
        //       WHERE category_id = ?
        //       [AND min_price >= ?]
        //       [AND max_price <= ?]
    }
}
