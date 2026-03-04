import { db } from '../../database/db';
import { products } from '../../database/schema/product.schema';
import { eq } from 'drizzle-orm';

export class ProductRepository {
  async findAll() {
    return db.select().from(products);
  }

  async findById(id: string) {
    return db.select().from(products).where(eq(products.id, id));
  }

  async create(data: any) {
    return db.insert(products).values(data).returning();
  }
}
