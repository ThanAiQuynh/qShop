import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ProductService } from "./product.service";
import { CreateProductDto } from "./dto/create-product.dto";


@Controller({ path: 'products', version: '1' })

export class ProductController {
    constructor(
        private readonly productService: ProductService
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() dto: CreateProductDto) {
        const product = await this.productService.create(dto);
        return {
            message: 'Product created successfully',
            data: product,
        }
    }
}