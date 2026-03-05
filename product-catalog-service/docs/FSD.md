# Functional Specification Document (FSD)
## product-catalog-service — qShop

**Phiên bản:** 1.0  
**Ngày:** 06/03/2026  
**Tác giả:** qShop Team  
**Trạng thái:** Draft  
**Tham chiếu:** [RSD.md](./RSD.md) | [product_catalog_erd.md](./product_catalog_erd.md)

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Cấu trúc dự án](#2-cấu-trúc-dự-án)
3. [Mô hình dữ liệu](#3-mô-hình-dữ-liệu)
4. [API Specification](#4-api-specification)
5. [Business Logic](#5-business-logic)
6. [Caching Layer](#6-caching-layer)
7. [Error Handling](#7-error-handling)
8. [Database & Indexing Strategy](#8-database--indexing-strategy)
9. [Security & Rate Limiting](#9-security--rate-limiting)
10. [Observability & Logging](#10-observability--logging)
11. [Health Check](#11-health-check)
12. [Deployment & Configuration](#12-deployment--configuration)

---

## 1. Tổng quan kiến trúc

### 1.1 Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Framework | NestJS 10.x (TypeScript) |
| Database | PostgreSQL 15+ (Drizzle ORM) |
| Cache | Redis 6+ (Cache-Aside pattern) |
| Validation | class-validator + class-transformer |
| Config | @nestjs/config + Joi |
| Health | @nestjs/terminus |
| Rate Limiting | @nestjs/throttler |
| Container | Docker (node:20-alpine, multi-stage) |

### 1.2 Kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────────────────┐
│                    API Gateway / Load Balancer                    │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│              product-catalog-service (NestJS)                   │
│                                                                  │
│   ┌─────────────┐   ┌─────────────┐   ┌──────────────────┐    │
│   │ Controllers │ → │  Services   │ → │  Repositories    │    │
│   │ (HTTP Layer)│   │ (Bus. Logic)│   │  (Data Access)   │    │
│   └─────────────┘   └──────┬──────┘   └────────┬─────────┘    │
│                             │                   │               │
│                    ┌────────▼────────┐  ┌───────▼─────────┐   │
│                    │  Redis Cache    │  │  PostgreSQL DB   │   │
│                    │  (Cache-Aside)  │  │  (Drizzle ORM)   │   │
│                    └─────────────────┘  └─────────────────-┘   │
└────────────────────────────────────────────────────────────────┘
```

### 1.3 Module Architecture (NestJS)

```
AppModule
├── ConfigModule (global)
├── CacheModule (global, Redis)
├── ThrottlerModule (global)
├── DatabaseModule
├── ProductModule
│   ├── ProductController
│   ├── ProductService
│   └── ProductRepository
├── BrandModule
├── CategoryModule
├── AttributeModule
├── VariantModule
├── ImageModule
└── HealthModule
```

---

## 2. Cấu trúc dự án

```
src/
├── common/
│   ├── constants/          # Hằng số dùng chung (CACHE_TTL, ...)
│   ├── exceptions/         # Custom exceptions
│   ├── filters/            # Global exception filters
│   ├── interceptors/       # Logging, Transform interceptors
│   └── utils/              # Utility functions
│
├── config/
│   ├── configuration.ts    # Config factory
│   └── env.validation.ts   # Joi schema validation
│
├── database/
│   ├── schema/             # Drizzle schema definitions
│   │   ├── brands.schema.ts
│   │   ├── products.schema.ts
│   │   ├── product-variants.schema.ts
│   │   ├── attributes.schema.ts
│   │   ├── attribute-values.schema.ts
│   │   ├── variant-attributes.schema.ts
│   │   ├── categories.schema.ts
│   │   ├── product-categories.schema.ts
│   │   ├── product-images.schema.ts
│   │   ├── product-facets.schema.ts
│   │   ├── product-filter-index.schema.ts
│   │   ├── variant-flattened.schema.ts
│   │   ├── price-history.schema.ts
│   │   ├── product-archives.schema.ts
│   │   └── index.ts
│   ├── migrations/
│   └── db.ts               # Drizzle + pg pool setup
│
├── product/
│   ├── dto/
│   │   ├── create-product.dto.ts
│   │   ├── update-product.dto.ts
│   │   └── filter-product.dto.ts
│   ├── repositories/
│   │   └── product.repository.ts
│   ├── product.controller.ts
│   ├── product.service.ts
│   └── product.module.ts
│
├── brand/          # Tương tự Product module
├── category/
├── attribute/
├── variant/
├── image/
├── health/
│
├── app.module.ts
└── main.ts
```

---

## 3. Mô hình dữ liệu

### 3.1 Entity Relationship Overview

```
brands ◄──── products ────► product_categories ────► categories(tree, materialized path)
                │                                     
                ├──► product_variants ────► variant_attributes ────► attribute_values
                │         │                                                │
                │         └──► price_history            attributes ◄───────┘
                │
                ├──► product_images
                ├──► product_facets
                ├──► product_filter_index
                └──► product_archives (sau 30 ngày soft-delete)

variant_flattened (denormalized, dùng cho search nhanh)
```

### 3.2 Chi tiết các bảng

#### brands
| Column | Type | Constraints |
|--------|------|------------|
| id | bigserial | PK |
| name | varchar(255) | NOT NULL |
| slug | varchar(255) | UNIQUE NOT NULL |
| logo | varchar(500) | |
| created_at | timestamp | DEFAULT NOW() |
| updated_at | timestamp | |
| deleted_at | timestamp | NULL = active |

#### products
| Column | Type | Constraints |
|--------|------|------------|
| id | bigserial | PK |
| name | varchar(500) | NOT NULL |
| slug | varchar(500) | UNIQUE NOT NULL |
| brand_id | bigint | FK → brands.id |
| description | text | |
| status | enum('active','draft') | DEFAULT 'draft' |
| created_at | timestamp | |
| updated_at | timestamp | |
| deleted_at | timestamp | |

#### product_variants
| Column | Type | Constraints |
|--------|------|------------|
| id | bigserial | PK |
| product_id | bigint | FK → products.id |
| sku | varchar(100) | UNIQUE NOT NULL |
| price | decimal(15,2) | NOT NULL |
| compare_price | decimal(15,2) | |
| weight | decimal(10,3) | |
| created_at | timestamp | |
| updated_at | timestamp | |
| deleted_at | timestamp | |

#### attributes
| Column | Type | Constraints |
|--------|------|------------|
| id | bigserial | PK |
| name | varchar(255) | NOT NULL |
| code | varchar(100) | UNIQUE NOT NULL |
| type | varchar(50) | (text, number, color) |

#### attribute_values
| Column | Type | Constraints |
|--------|------|------------|
| id | bigserial | PK |
| attribute_id | bigint | FK → attributes.id |
| value | varchar(255) | NOT NULL |

#### variant_attributes (junction)
| Column | Type | Constraints |
|--------|------|------------|
| variant_id | bigint | FK → product_variants.id |
| attribute_value_id | bigint | FK → attribute_values.id |
| PK | composite | (variant_id, attribute_value_id) |

#### categories
| Column | Type | Constraints |
|--------|------|------------|
| id | bigserial | PK |
| name | varchar(255) | NOT NULL |
| slug | varchar(255) | UNIQUE NOT NULL |
| parent_id | bigint | FK → categories.id, NULL = root |
| path | varchar(500) | VD: "1/5/12/" |
| depth | int | Root = 0 |

#### product_categories (junction)
| Column | Type |
|--------|------|
| product_id | bigint FK |
| category_id | bigint FK |

#### product_images
| Column | Type | Constraints |
|--------|------|------------|
| id | bigserial | PK |
| product_id | bigint | FK NOT NULL |
| variant_id | bigint | FK, NULL = ảnh chung |
| url | varchar(1000) | NOT NULL |
| alt_text | varchar(500) | |
| position | int | DEFAULT 0 |
| is_primary | boolean | DEFAULT false |

#### product_facets
| Column | Type |
|--------|------|
| product_id | bigint FK |
| facet_key | varchar(100) |
| facet_value | varchar(255) |

#### product_filter_index (materialized)
| Column | Type |
|--------|------|
| product_id | bigint FK |
| category_id | bigint |
| min_price | decimal |
| max_price | decimal |
| colors | text[] |
| sizes | text[] |
| storages | text[] |

#### variant_flattened (denormalized)
| Column | Type |
|--------|------|
| variant_id | bigint FK |
| product_id | bigint FK |
| color | varchar |
| size | varchar |
| storage | varchar |
| price | decimal |

#### price_history
| Column | Type |
|--------|------|
| id | bigserial PK |
| variant_id | bigint FK |
| old_price | decimal |
| new_price | decimal |
| changed_by | varchar |
| changed_at | timestamp |

#### product_archives
| Column | Type |
|--------|------|
| id | bigserial PK |
| original_product_id | bigint |
| data_json | jsonb |
| deleted_at | timestamp |

---

## 4. API Specification

**Base URL:** `/api/v1`  
**Content-Type:** `application/json`  
**Authentication:** Handled by upstream API Gateway

### 4.1 Products

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/products` | Danh sách sản phẩm (phân trang + filter) | Public |
| `GET` | `/products/:id` | Chi tiết sản phẩm theo ID | Public |
| `GET` | `/products/slug/:slug` | Chi tiết sản phẩm theo slug | Public |
| `POST` | `/products` | Tạo sản phẩm mới | Admin |
| `PATCH` | `/products/:id` | Cập nhật sản phẩm | Admin |
| `DELETE` | `/products/:id` | Soft delete sản phẩm | Admin |
| `POST` | `/products/:id/restore` | Khôi phục sản phẩm | Admin |
| `PATCH` | `/products/:id/publish` | Publish sản phẩm | Admin |
| `PATCH` | `/products/:id/unpublish` | Unpublish sản phẩm | Admin |

#### GET /products — Query Parameters

| Param | Type | Mô tả |
|-------|------|-------|
| `page` | number | Trang hiện tại (default: 1) |
| `limit` | number | Số lượng/trang (default: 20, max: 100) |
| `brand_id` | number | Lọc theo thương hiệu |
| `category_id` | number | Lọc theo danh mục (bao gồm danh mục con) |
| `status` | string | `active` / `draft` |
| `min_price` | number | Giá tối thiểu |
| `max_price` | number | Giá tối đa |
| `color` | string | Lọc theo màu |
| `size` | string | Lọc theo kích cỡ |
| `storage` | string | Lọc theo dung lượng |
| `q` | string | Full-text search |
| `sort` | string | `created_at_desc`, `price_asc`, `price_desc`, `name_asc` |

#### Response Format (Danh sách)
```json
{
  "data": [ /* array of products */ ],
  "meta": {
    "total": 1250,
    "page": 1,
    "limit": 20,
    "totalPages": 63
  }
}
```

#### Response Format (Chi tiết Product)
```json
{
  "id": 1,
  "name": "iPhone 15",
  "slug": "iphone-15",
  "brand": { "id": 1, "name": "Apple", "slug": "apple" },
  "description": "...",
  "status": "active",
  "categories": [{ "id": 12, "name": "Smartphone", "path": "1/5/12/" }],
  "variants": [
    {
      "id": 1,
      "sku": "IP15-128-BLK",
      "price": 22000000,
      "compare_price": 24000000,
      "attributes": [
        { "code": "color", "value": "black" },
        { "code": "storage", "value": "128GB" }
      ]
    }
  ],
  "images": [
    { "id": 1, "url": "...", "alt_text": "...", "is_primary": true, "variant_id": null }
  ],
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-15T00:00:00Z"
}
```

### 4.2 Brands

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/brands` | Danh sách thương hiệu |
| `GET` | `/brands/:id` | Chi tiết thương hiệu |
| `POST` | `/brands` | Tạo thương hiệu |
| `PATCH` | `/brands/:id` | Cập nhật thương hiệu |
| `DELETE` | `/brands/:id` | Soft delete thương hiệu |

### 4.3 Categories

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/categories` | Toàn bộ cây danh mục |
| `GET` | `/categories/:id` | Chi tiết 1 danh mục |
| `GET` | `/categories/:id/tree` | Cây con từ danh mục này |
| `GET` | `/categories/:id/products` | Sản phẩm thuộc danh mục (bao gồm con) |
| `POST` | `/categories` | Tạo danh mục |
| `PATCH` | `/categories/:id` | Cập nhật danh mục |
| `DELETE` | `/categories/:id` | Soft delete danh mục |

### 4.4 Attributes

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/attributes` | Danh sách attributes |
| `GET` | `/attributes/:id/values` | Danh sách values của attribute |
| `POST` | `/attributes` | Tạo attribute |
| `POST` | `/attributes/:id/values` | Tạo attribute value |
| `PATCH` | `/attributes/:id` | Cập nhật attribute |
| `DELETE` | `/attributes/:id` | Xóa attribute |

### 4.5 Variants

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/products/:productId/variants` | Danh sách variants của product |
| `GET` | `/variants/:id` | Chi tiết variant |
| `POST` | `/products/:productId/variants` | Tạo variant |
| `PATCH` | `/variants/:id` | Cập nhật variant (ghi price_history nếu giá đổi) |
| `DELETE` | `/variants/:id` | Soft delete variant |
| `GET` | `/variants/:id/price-history` | Lịch sử giá |

### 4.6 Images

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/products/:productId/images` | Danh sách ảnh sản phẩm |
| `POST` | `/products/:productId/images` | Thêm ảnh |
| `PATCH` | `/images/:id` | Cập nhật ảnh |
| `DELETE` | `/images/:id` | Xóa ảnh |
| `PATCH` | `/images/:id/set-primary` | Đặt ảnh làm primary |

### 4.7 Search & Filter

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/search` | Tìm kiếm sản phẩm (full-text + filter) |
| `GET` | `/search/facets` | Lấy facet metadata cho trang filter |

---

## 5. Business Logic

### 5.1 Soft Delete & Archive Flow

```
Yêu cầu xóa product
        │
        ▼
[Soft Delete] → set deleted_at = NOW()
        │
        ▼
Sau 30 ngày (cron job chạy hàng ngày)
        │
        ├── Serialize toàn bộ product data → JSON
        │   (bao gồm variants, attributes, images, categories)
        │
        ├── INSERT INTO product_archives (original_product_id, data_json, deleted_at)
        │
        └── DELETE FROM products WHERE deleted_at < NOW() - INTERVAL '30 days'
            (Cascade hoặc xóa theo thứ tự FK)
```

### 5.2 Cache-Aside Pattern

```
GET /products/:id
        │
        ▼
Kiểm tra Redis key: "product:{id}"
        │
   ┌────┴────┐
 HIT│        │MISS
   ▼         ▼
Return    Query PostgreSQL
cache         │
              ▼
          Ghi cache (TTL: 3600s)
              │
              ▼
           Return
```

**Cache Invalidation:**
- `POST /products` → flush `products:list:*`
- `PATCH /products/:id` → delete `product:{id}`, flush `products:list:*`
- `DELETE /products/:id` → delete `product:{id}`, flush `products:list:*`

**Cache Key Conventions:**
```
product:{id}                    → Chi tiết sản phẩm
product:slug:{slug}             → Sản phẩm theo slug
products:list:{hash(query)}     → Danh sách có filter/paging
brands:all                      → Toàn bộ brands
categories:tree                 → Cây danh mục
variant:{id}                    → Chi tiết variant
```

### 5.3 Price History Logic

Khi `PATCH /variants/:id` với giá thay đổi:
1. Lấy `old_price` hiện tại từ DB.
2. Cập nhật `price` mới trên bảng `product_variants`.
3. INSERT vào `price_history`: `(variant_id, old_price, new_price, changed_by, changed_at)`.
4. Invalidate cache cho variant và product tương ứng.

### 5.4 Category Path Management

Khi tạo/di chuyển danh mục:
- `path` = `parent.path + new_id + "/"`
- `depth` = `parent.depth + 1`
- Nếu là root: `path = "{id}/"`, `depth = 0`

Lấy cây con (tất cả sản phẩm dưới Electronics - id=1):
```sql
SELECT * FROM categories WHERE path LIKE '1/%';
```

### 5.5 Variant Flattened Sync

Khi có thay đổi variant hoặc attribute:
- Cập nhật bảng `variant_flattened` để giữ dữ liệu đồng bộ.
- Có thể thực hiện qua trigger PostgreSQL hoặc service logic sau mỗi mutation.

### 5.6 Filter Index Maintenance

Bảng `product_filter_index` được refresh:
- Sau mỗi thay đổi liên quan: thêm/xóa variant, thay đổi price, thay đổi category.
- Hoặc bằng scheduled job để recalculate theo batch.

---

## 6. Caching Layer

### 6.1 Cấu hình Redis

```typescript
// app.module.ts
CacheModule.registerAsync({
  isGlobal: true,
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => ({
    store: redisStore,
    url: config.get('redisUrl'),
    ttl: 3600,        // Default TTL: 1 giờ
    max: 1000,        // Max số items trong cache
  }),
});
```

### 6.2 TTL Strategy

| Cache Key | TTL |
|-----------|-----|
| Chi tiết sản phẩm | 3600s (1h) |
| Danh sách sản phẩm | 300s (5 phút) |
| Cây danh mục | 7200s (2h) |
| Danh sách brands | 7200s (2h) |
| Facet metadata | 600s (10 phút) |

### 6.3 Redis Resource Limits

- **maxmemory:** 256MB – 512MB
- **maxmemory-policy:** `allkeys-lru` (xóa key ít dùng nhất khi đầy bộ nhớ)

---

## 7. Error Handling

### 7.1 HTTP Error Codes

| HTTP Status | Tình huống |
|------------|-----------|
| 200 OK | Thành công |
| 201 Created | Tạo mới thành công |
| 400 Bad Request | Validation error, input không hợp lệ |
| 404 Not Found | Resource không tồn tại |
| 409 Conflict | Duplicate slug/sku |
| 422 Unprocessable Entity | Business rule violation |
| 429 Too Many Requests | Rate limit exceeded |
| 500 Internal Server Error | Lỗi server không xác định |

### 7.2 Error Response Format

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Slug 'iphone-15' already exists",
  "timestamp": "2026-03-06T02:30:00.000Z",
  "path": "/api/v1/products",
  "requestId": "req-abc123"
}
```

### 7.3 Global Exception Filter

- Bắt tất cả exception, format theo chuẩn trên.
- Log error với correlation ID.
- Không expose stack trace ở production.

---

## 8. Database & Indexing Strategy

### 8.1 Connection Pool

```typescript
// database/db.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 15,                      // Pool size 10–15
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 8.2 Indexes

#### Products
```sql
-- Query active products (phổ biến nhất)
CREATE INDEX idx_products_status_deleted ON products(status, deleted_at);
-- Lookup by slug (URL)
CREATE UNIQUE INDEX idx_products_slug ON products(slug);
-- Filter by brand
CREATE INDEX idx_products_brand_status ON products(brand_id, status);
```

#### Categories
```sql
-- Materialized path tree query
CREATE INDEX idx_categories_path ON categories(path);
-- Query by depth/parent
CREATE INDEX idx_categories_depth_parent ON categories(depth, parent_id);
-- Product-Category mapping
CREATE INDEX idx_product_categories_category ON product_categories(category_id);
CREATE INDEX idx_product_categories_product ON product_categories(product_id);
```

#### Variants
```sql
-- All variants of a product
CREATE INDEX idx_variants_product_deleted ON product_variants(product_id, deleted_at);
-- SKU lookup
CREATE UNIQUE INDEX idx_variants_sku ON product_variants(sku);
-- Price range filter
CREATE INDEX idx_variants_price ON product_variants(price);
```

#### Attributes
```sql
CREATE INDEX idx_attr_values_attribute ON attribute_values(attribute_id);
CREATE INDEX idx_variant_attrs_value ON variant_attributes(attribute_value_id);
CREATE INDEX idx_variant_attrs_variant ON variant_attributes(variant_id);
```

#### Filter & Search Tables
```sql
-- Main filter query
CREATE INDEX idx_filter_idx_category_price ON product_filter_index(category_id, min_price, max_price);
-- variant_flattened search indexes
CREATE INDEX idx_vf_color ON variant_flattened(color);
CREATE INDEX idx_vf_storage ON variant_flattened(storage);
CREATE INDEX idx_vf_size ON variant_flattened(size);
CREATE INDEX idx_vf_price ON variant_flattened(price);
CREATE INDEX idx_vf_product_color_price ON variant_flattened(product_id, color, price);
-- Image retrieval
CREATE INDEX idx_images_product_variant ON product_images(product_id, variant_id, is_primary);
-- Price history
CREATE INDEX idx_price_history_variant_time ON price_history(variant_id, changed_at);
-- Full-text search (GIN)
CREATE INDEX idx_products_fts ON products USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

---

## 9. Security & Rate Limiting

### 9.1 Rate Limiting Config

```typescript
ThrottlerModule.forRoot([{
  name: 'short',
  ttl: 1000,    // 1 giây
  limit: 20,    // 20 request/giây
}, {
  name: 'medium',
  ttl: 60000,   // 1 phút
  limit: 300,   // 300 request/phút
}])
```

### 9.2 Input Validation

- **Global ValidationPipe** apply cho toàn bộ request.
- `whitelist: true` — tự động loại bỏ field không khai báo trong DTO.
- `forbidNonWhitelisted: true` — trả lỗi nếu có field lạ.
- `transform: true` — tự động convert type.

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

### 9.3 DTO Examples

#### CreateProductDto
```typescript
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang' })
  slug: string;

  @IsInt()
  @IsPositive()
  brand_id: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['active', 'draft'])
  @IsOptional()
  status?: 'active' | 'draft' = 'draft';
}
```

---

## 10. Observability & Logging

### 10.1 Structured Logging

- **Format:** JSON (Winston hoặc Pino)
- **Fields bắt buộc:** `timestamp`, `level`, `message`, `requestId`, `service`

```json
{
  "timestamp": "2026-03-06T02:30:00.000Z",
  "level": "info",
  "message": "GET /products/1 → 200 (12ms, cache HIT)",
  "requestId": "req-abc123",
  "service": "product-catalog-service",
  "userId": null,
  "duration": 12
}
```

### 10.2 Correlation ID (Request ID)

- Mỗi request được gán một `requestId` duy nhất (UUID v4).
- `requestId` được propagate qua `AsyncLocalStorage` để đính kèm vào mọi log.
- Response header: `X-Request-Id: req-abc123`.

### 10.3 Logging Interceptor

- Log mọi request: `method`, `url`, `statusCode`, `duration`, `requestId`.
- Log error với stack trace ở development.

### 10.4 Memory Monitoring

- Health check cảnh báo khi `heapUsed > 1.5 GB`.
- Config: `NODE_OPTIONS=--max-old-space-size=2048`.

---

## 11. Health Check

### 11.1 Endpoints

| Endpoint | Mô tả | Response |
|----------|-------|---------|
| `GET /api/v1/health/live` | Liveness: Service còn sống | 200 OK |
| `GET /api/v1/health/ready` | Readiness: DB + Redis sẵn sàng | 200 / 503 |

### 11.2 Readiness Check Response

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up", "responseTime": 3 },
    "redis": { "status": "up", "responseTime": 1 },
    "memory": { "status": "up", "heapUsed": "512MB" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### 11.3 Graceful Shutdown

```typescript
// main.ts
app.enableShutdownHooks();    // Bắt SIGTERM, SIGINT

// Xử lý graceful:
// 1. Ngừng nhận request mới
// 2. Chờ request hiện tại hoàn thành (max 15s)
// 3. Đóng DB pool, Redis connection
// 4. Exit process
```

---

## 12. Deployment & Configuration

### 12.1 Biến môi trường

| Biến | Bắt buộc | Default | Mô tả |
|------|----------|---------|-------|
| `PORT` | No | 3000 | Port lắng nghe |
| `NODE_ENV` | No | development | Môi trường |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `REDIS_URL` | No | redis://localhost:6379 | Redis URL |
| `LOG_LEVEL` | No | info | Log level |

### 12.2 Dockerfile (Multi-stage Alpine)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --prod --frozen-lockfile
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "--max-old-space-size=2048", "dist/main"]
```

### 12.3 Docker Compose (Dev)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: product_catalog
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports: ["6379:6379"]

  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/product_catalog
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
    depends_on: [postgres, redis]

volumes:
  postgres_data:
```

### 12.4 API Prefix & Versioning

```typescript
// main.ts
app.setGlobalPrefix('api');
// Routes: /api/v1/products, /api/v1/brands, ...
```

### 12.5 Swagger Documentation

```typescript
// main.ts (chỉ ở development/staging)
if (process.env.NODE_ENV !== 'production') {
  const config = new DocumentBuilder()
    .setTitle('Product Catalog API')
    .setDescription('qShop Product Catalog Service')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);
}
```

Swagger UI: `http://localhost:3000/api/v1/docs`

---

## Phụ lục: Roadmap triển khai

| Tuần | Nội dung |
|------|---------|
| **Tuần 1** | Foundation: Health check, Config, Graceful shutdown, ValidationPipe |
| **Tuần 2** | Trụ cột 1: Redis Cache-Aside, PostgreSQL + Indexing, Product CRUD |
| **Tuần 3** | Trụ cột 2: Connection pool, Throttler, Resource limits, Brand/Category/Variant |
| **Tuần 4** | Trụ cột 3: Stateless, Docker Alpine, Attribute/Image/Filter |
| **Tuần 5+** | Reliability: Retry, Circuit breaker, Structured logging, Price History |
| **Tuần 6** | Verification: Load Test (k6/autocannon), Benchmarking, Archive job |
