import { Injectable } from '@nestjs/common';
import { db, schema } from '../../../../database/db';

@Injectable()
export class BrandRepository {

    /** Lấy brand info — PK lookup, nên cache Redis */
    async findById(id: number) {
        // TODO: db.query.brands.findFirst, eq(id)
    }

    /** Batch load brands — WHERE id IN (...) */
    async findByIds(ids: number[]) {
        // TODO: WHERE id IN (...) AND deleted_at IS NULL
    }
}
