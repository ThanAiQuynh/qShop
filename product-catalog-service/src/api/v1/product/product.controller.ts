import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { QueryProductDto } from './dto/query-product.dto';
import { ProductService } from './product.service';

@Controller({
    path: 'products',
    version: '1',
})
export class ProductController {

    constructor(private readonly productService: ProductService) { }

    // GET /v1/products  — Danh sách sản phẩm (có filter/phân trang)
    @Get()
    async findAll(@Query() query: QueryProductDto) {
        // TODO
    }

    // GET /v1/products/slug/:slug  — Chi tiết theo slug
    @Get('slug/:slug')
    async findBySlug(@Param('slug') slug: string) {
        // TODO
    }

    // GET /v1/products/:id  — Chi tiết theo ID
    @Get(':id')
    async findById(@Param('id', ParseIntPipe) id: number) {
        // TODO
    }

    // POST /v1/products  — Tạo mới
    @Post()
    async create(@Body() body: Record<string, any>) {
        // TODO
    }

    // PATCH /v1/products/:id  — Cập nhật một phần
    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: Record<string, any>,
    ) {
        // TODO
    }

    // DELETE /v1/products/:id  — Xóa (soft delete)
    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        // TODO
    }
}
