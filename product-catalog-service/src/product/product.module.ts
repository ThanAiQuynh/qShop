import { Module } from '@nestjs/common';
import { ProductRepository } from './repositories/product.repository';

@Module({
  providers: [ProductRepository],
})
export class ProductModule {}
