# API Documentation
## product-catalog-service — qShop

**Version:** 1.0  
**Date:** 06/03/2026  
**Author:** qShop Team  
**Status:** Draft  
**References:** [RSD.md](./RSD.md) | [FSD.md](./FSD.md) | [ERD](./product_catalog_erd.md)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Base URL & Versioning](#2-base-url--versioning)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Request & Response Format](#4-request--response-format)
5. [Error Handling](#5-error-handling)
6. [Rate Limiting](#6-rate-limiting)
7. [Endpoints](#7-endpoints)
   - [7.1 Products](#71-products)
   - [7.2 Brands](#72-brands)
   - [7.3 Categories](#73-categories)
   - [7.4 Attributes](#74-attributes)
   - [7.5 Variants](#75-variants)
   - [7.6 Images](#76-images)
   - [7.7 Search & Filter](#77-search--filter)
   - [7.8 Health Check](#78-health-check)
8. [Data Models](#8-data-models)
9. [Cache Strategy](#9-cache-strategy)
10. [Implementation Status](#10-implementation-status)

---

## 1. Overview

`product-catalog-service` là microservice quản lý toàn bộ vòng đời sản phẩm trong hệ thống thương mại điện tử **qShop**.

**Chức năng chính:**
- Quản lý Products, Variants/SKU
- Quản lý Brands, Categories (dạng cây), Attributes
- Quản lý Product Images
- Tìm kiếm và lọc sản phẩm (Faceted Filter)
- Theo dõi lịch sử giá (Price History)
- Soft Delete với grace period 30 ngày + Product Archive

**Tech stack:** NestJS 10 · PostgreSQL 15 (Drizzle ORM) · Redis 6 · Node.js 20

---

## 2. Base URL & Versioning

```
Base URL:       http://localhost:3000
API Prefix:     /api
Version Prefix: /v1

Full base:      http://localhost:3000/api/v1
```

Tất cả các endpoint đều nằm dưới prefix `/api/v1`. Ví dụ:

```
GET http://localhost:3000/api/v1/products
POST http://localhost:3000/api/v1/products
```

**Swagger UI (Development only):**
```
http://localhost:3000/api/v1/docs
```

---

## 3. Authentication & Authorization

Authentication được xử lý bởi **API Gateway** hoặc `auth-service` ở tầng trên — ngoài phạm vi của service này.

| Loại endpoint | Auth yêu cầu |
|--------------|--------------|
| `GET` (đọc dữ liệu) | Public (không cần auth) |
| `POST`, `PATCH`, `DELETE` | Admin (xác thực bởi Gateway) |

---

## 4. Request & Response Format

### Request

- **Content-Type:** `application/json`
- Toàn bộ request body được validate qua `class-validator` + `ValidationPipe`
- Field không khai báo trong DTO sẽ bị loại bỏ tự động (`whitelist: true`)
- Field lạ sẽ trả lỗi 400 (`forbidNonWhitelisted: true`)
- Type tự động convert (`transform: true`)

### Response — Danh sách (Paginated)

```json
{
  "data": [ /* array of items */ ],
  "meta": {
    "total": 1250,
    "page": 1,
    "limit": 20,
    "totalPages": 63
  }
}
```

### Response — Tạo mới (201 Created)

```json
{
  "message": "Product created successfully",
  "data": { /* created object */ }
}
```

### Response Headers

| Header | Mô tả |
|--------|-------|
| `Content-Type` | `application/json; charset=utf-8` |
| `X-Request-Id` | UUID dùng để tracing log (`req-abc123`) |

---

## 5. Error Handling

### HTTP Status Codes

| Status | Tình huống |
|--------|-----------|
| `200 OK` | Thành công (GET, PATCH) |
| `201 Created` | Tạo mới thành công |
| `400 Bad Request` | Validation error, input không hợp lệ |
| `404 Not Found` | Resource không tồn tại |
| `409 Conflict` | Duplicate slug / SKU |
| `422 Unprocessable Entity` | Vi phạm business rule |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Lỗi server không xác định |
| `503 Service Unavailable` | DB hoặc Redis không sẵn sàng |

### Error Response Format

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

### Validation Error (400)

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "name should not be empty",
    "slug must contain only lowercase letters, numbers, and hyphens",
    "brandId must be a positive integer"
  ],
  "timestamp": "2026-03-06T02:30:00.000Z",
  "path": "/api/v1/products",
  "requestId": "req-abc123"
}
```

---

## 6. Rate Limiting

Sử dụng `@nestjs/throttler`:

| Window | Giới hạn |
|--------|---------|
| Per-second (short) | 20 request/giây |
| Per-minute (medium) | 300 request/phút |

Khi vượt giới hạn, trả về `429 Too Many Requests`.

---

## 7. Endpoints

---

### 7.1 Products

#### `GET /products` — Danh sách sản phẩm

Lấy danh sách sản phẩm có hỗ trợ phân trang, lọc và sắp xếp.

**Query Parameters:**

| Param | Type | Default | Mô tả |
|-------|------|---------|-------|
| `page` | `number` | `1` | Trang hiện tại |
| `limit` | `number` | `20` | Số lượng/trang (max: 100) |
| `brand_id` | `number` | — | Lọc theo thương hiệu |
| `category_id` | `number` | — | Lọc theo danh mục (bao gồm danh mục con) |
| `status` | `string` | — | `active` \| `draft` |
| `min_price` | `number` | — | Giá tối thiểu |
| `max_price` | `number` | — | Giá tối đa |
| `color` | `string` | — | Lọc theo màu (VD: `black`, `white`) |
| `size` | `string` | — | Lọc theo kích cỡ (VD: `S`, `M`, `L`, `XL`) |
| `storage` | `string` | — | Lọc theo dung lượng (VD: `128GB`, `256GB`) |
| `q` | `string` | — | Full-text search theo tên sản phẩm |
| `sort` | `string` | `created_at_desc` | `created_at_desc` \| `price_asc` \| `price_desc` \| `name_asc` |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "iPhone 15",
      "slug": "iphone-15",
      "brand": { "id": 1, "name": "Apple", "slug": "apple" },
      "status": "active",
      "minPrice": 22000000,
      "maxPrice": 28000000,
      "primaryImage": {
        "url": "https://cdn.example.com/iphone-15.jpg",
        "alt_text": "iPhone 15"
      },
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 1250,
    "page": 1,
    "limit": 20,
    "totalPages": 63
  }
}
```

---

#### `GET /products/:id` — Chi tiết sản phẩm theo ID

**Path Parameters:**

| Param | Type | Mô tả |
|-------|------|-------|
| `id` | `number` | ID sản phẩm |

**Response `200 OK`:**

```json
{
  "id": 1,
  "name": "iPhone 15",
  "slug": "iphone-15",
  "brand": { "id": 1, "name": "Apple", "slug": "apple" },
  "description": "iPhone 15 với chip A16 Bionic, màn hình Super Retina XDR 6.1 inch.",
  "status": "active",
  "categories": [
    { "id": 12, "name": "Smartphone", "slug": "smartphone", "path": "1/5/12/" }
  ],
  "variants": [
    {
      "id": 1,
      "sku": "IP15-128-BLK",
      "price": 22000000,
      "compare_price": 24000000,
      "weight": 0.171,
      "attributes": [
        { "code": "color", "name": "Màu sắc", "value": "black" },
        { "code": "storage", "name": "Dung lượng", "value": "128GB" }
      ]
    },
    {
      "id": 2,
      "sku": "IP15-256-BLK",
      "price": 25000000,
      "compare_price": 27000000,
      "weight": 0.171,
      "attributes": [
        { "code": "color", "name": "Màu sắc", "value": "black" },
        { "code": "storage", "name": "Dung lượng", "value": "256GB" }
      ]
    }
  ],
  "images": [
    {
      "id": 1,
      "url": "https://cdn.example.com/iphone-15-black.jpg",
      "alt_text": "iPhone 15 màu đen",
      "position": 0,
      "is_primary": true,
      "variant_id": null
    }
  ],
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-15T00:00:00Z"
}
```

**Response `404 Not Found`:**

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Product with id '999' not found"
}
```

---

#### `GET /products/slug/:slug` — Chi tiết sản phẩm theo slug

**Path Parameters:**

| Param | Type | Mô tả |
|-------|------|-------|
| `slug` | `string` | Slug sản phẩm (VD: `iphone-15`) |

Response format giống `GET /products/:id`.

---

#### `POST /products` — Tạo sản phẩm mới

> **Auth:** Admin

**Request Body:**

```json
{
  "name": "iPhone 15",
  "slug": "iphone-15",
  "brandId": 1,
  "description": "iPhone 15 với chip A16 Bionic.",
  "status": "draft"
}
```

**Request Body Schema (`CreateProductDto`):**

| Field | Type | Required | Validation | Mô tả |
|-------|------|----------|-----------|-------|
| `name` | `string` | ✅ | `maxLength: 255`, not empty | Tên sản phẩm |
| `slug` | `string` | ✅ | `^[a-z0-9-]+$`, unique | URL-friendly slug |
| `brandId` | `number` | ✅ | positive integer | FK → brands.id |
| `description` | `string` | ❌ | — | Mô tả sản phẩm |
| `status` | `string` | ❌ | `active` \| `draft` | Default: `draft` |

**Response `201 Created`:**

```json
{
  "message": "Product created successfully",
  "data": {
    "id": 42,
    "name": "iPhone 15",
    "slug": "iphone-15",
    "brandId": 1,
    "description": "iPhone 15 với chip A16 Bionic.",
    "status": "draft",
    "created_at": "2026-03-06T02:30:00.000Z",
    "updated_at": "2026-03-06T02:30:00.000Z",
    "deleted_at": null
  }
}
```

**Response `409 Conflict`** (slug đã tồn tại):

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Slug 'iphone-15' already exists"
}
```

---

#### `PATCH /products/:id` — Cập nhật sản phẩm

> **Auth:** Admin

**Path Parameters:** `id` (number)

**Request Body** (tất cả fields đều optional):

```json
{
  "name": "iPhone 15 Pro",
  "description": "Mô tả mới.",
  "status": "active"
}
```

**Response `200 OK`:**

```json
{
  "message": "Product updated successfully",
  "data": { /* updated product object */ }
}
```

> Cache `product:{id}` và `products:list:*` sẽ bị invalidate ngay sau khi cập nhật.

---

#### `DELETE /products/:id` — Soft delete sản phẩm

> **Auth:** Admin

**Path Parameters:** `id` (number)

Thực hiện **Soft Delete**: gán `deleted_at = NOW()`. Sản phẩm vẫn tồn tại trong DB.

Sau **30 ngày** grace period, cron job sẽ tự động:
1. Serialize toàn bộ data → JSON
2. Lưu vào bảng `product_archives`
3. Hard delete khỏi bảng `products`

**Response `200 OK`:**

```json
{
  "message": "Product deleted successfully"
}
```

---

#### `POST /products/:id/restore` — Khôi phục sản phẩm

> **Auth:** Admin

Khôi phục sản phẩm đã soft-delete (trong vòng 30 ngày grace period). Gán `deleted_at = NULL`.

**Response `200 OK`:**

```json
{
  "message": "Product restored successfully",
  "data": { /* restored product object */ }
}
```

---

#### `PATCH /products/:id/publish` — Publish sản phẩm

> **Auth:** Admin

Chuyển trạng thái sản phẩm sang `active`.

**Response `200 OK`:**

```json
{
  "message": "Product published successfully",
  "data": { "id": 42, "status": "active" }
}
```

---

#### `PATCH /products/:id/unpublish` — Unpublish sản phẩm

> **Auth:** Admin

Chuyển trạng thái sản phẩm về `draft`.

**Response `200 OK`:**

```json
{
  "message": "Product unpublished successfully",
  "data": { "id": 42, "status": "draft" }
}
```

---

### 7.2 Brands

#### Endpoints Overview

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/brands` | Danh sách thương hiệu | Public |
| `GET` | `/brands/:id` | Chi tiết thương hiệu | Public |
| `POST` | `/brands` | Tạo thương hiệu | Admin |
| `PATCH` | `/brands/:id` | Cập nhật thương hiệu | Admin |
| `DELETE` | `/brands/:id` | Soft delete thương hiệu | Admin |

---

#### `GET /brands` — Danh sách thương hiệu

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Apple",
      "slug": "apple",
      "logo": "https://cdn.example.com/logos/apple.png",
      "created_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "name": "Samsung",
      "slug": "samsung",
      "logo": "https://cdn.example.com/logos/samsung.png",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `POST /brands` — Tạo thương hiệu

> **Auth:** Admin

**Request Body:**

```json
{
  "name": "Apple",
  "slug": "apple",
  "logo": "https://cdn.example.com/logos/apple.png"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `name` | `string` | ✅ | `maxLength: 255`, not empty |
| `slug` | `string` | ✅ | `^[a-z0-9-]+$`, unique |
| `logo` | `string` | ❌ | URL, `maxLength: 500` |

**Response `201 Created`:**

```json
{
  "message": "Brand created successfully",
  "data": {
    "id": 1,
    "name": "Apple",
    "slug": "apple",
    "logo": "https://cdn.example.com/logos/apple.png",
    "created_at": "2026-03-06T02:30:00.000Z"
  }
}
```

---

### 7.3 Categories

#### Endpoints Overview

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/categories` | Toàn bộ cây danh mục | Public |
| `GET` | `/categories/:id` | Chi tiết 1 danh mục | Public |
| `GET` | `/categories/:id/tree` | Cây con từ danh mục này | Public |
| `GET` | `/categories/:id/products` | Sản phẩm thuộc danh mục (kể cả con) | Public |
| `POST` | `/categories` | Tạo danh mục | Admin |
| `PATCH` | `/categories/:id` | Cập nhật danh mục | Admin |
| `DELETE` | `/categories/:id` | Soft delete danh mục | Admin |

---

#### `GET /categories` — Toàn bộ cây danh mục

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Electronics",
      "slug": "electronics",
      "parent_id": null,
      "path": "1/",
      "depth": 0,
      "children": [
        {
          "id": 5,
          "name": "Phone",
          "slug": "phone",
          "parent_id": 1,
          "path": "1/5/",
          "depth": 1,
          "children": [
            {
              "id": 12,
              "name": "Smartphone",
              "slug": "smartphone",
              "parent_id": 5,
              "path": "1/5/12/",
              "depth": 2,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

---

#### `POST /categories` — Tạo danh mục

> **Auth:** Admin

**Request Body:**

```json
{
  "name": "Smartphone",
  "slug": "smartphone",
  "parent_id": 5
}
```

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `name` | `string` | ✅ | Tên danh mục |
| `slug` | `string` | ✅ | URL-friendly slug, unique |
| `parent_id` | `number` | ❌ | ID danh mục cha. Null = root |

> `path` và `depth` được tính tự động từ `parent_id`.

**Response `201 Created`:**

```json
{
  "message": "Category created successfully",
  "data": {
    "id": 12,
    "name": "Smartphone",
    "slug": "smartphone",
    "parent_id": 5,
    "path": "1/5/12/",
    "depth": 2
  }
}
```

---

### 7.4 Attributes

#### Endpoints Overview

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/attributes` | Danh sách attributes | Public |
| `GET` | `/attributes/:id/values` | Danh sách values của attribute | Public |
| `POST` | `/attributes` | Tạo attribute | Admin |
| `POST` | `/attributes/:id/values` | Tạo attribute value | Admin |
| `PATCH` | `/attributes/:id` | Cập nhật attribute | Admin |
| `DELETE` | `/attributes/:id` | Xóa attribute | Admin |

---

#### `GET /attributes` — Danh sách attributes

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Màu sắc",
      "code": "color",
      "type": "color"
    },
    {
      "id": 2,
      "name": "Kích cỡ",
      "code": "size",
      "type": "text"
    },
    {
      "id": 3,
      "name": "Dung lượng",
      "code": "storage",
      "type": "text"
    }
  ]
}
```

---

#### `GET /attributes/:id/values` — Danh sách values của attribute

**Response `200 OK`:**

```json
{
  "data": [
    { "id": 1, "attribute_id": 1, "value": "black" },
    { "id": 2, "attribute_id": 1, "value": "white" },
    { "id": 3, "attribute_id": 1, "value": "blue" }
  ]
}
```

---

#### `POST /attributes` — Tạo attribute

> **Auth:** Admin

**Request Body:**

```json
{
  "name": "Màu sắc",
  "code": "color",
  "type": "color"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `name` | `string` | ✅ | `maxLength: 255` |
| `code` | `string` | ✅ | `maxLength: 100`, unique |
| `type` | `string` | ✅ | `text` \| `number` \| `color` |

---

#### `POST /attributes/:id/values` — Tạo attribute value

> **Auth:** Admin

**Request Body:**

```json
{
  "value": "black"
}
```

**Response `201 Created`:**

```json
{
  "message": "Attribute value created successfully",
  "data": {
    "id": 1,
    "attribute_id": 1,
    "value": "black"
  }
}
```

---

### 7.5 Variants

#### Endpoints Overview

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/products/:productId/variants` | Danh sách variants của product | Public |
| `GET` | `/variants/:id` | Chi tiết variant | Public |
| `GET` | `/variants/:id/price-history` | Lịch sử giá của variant | Public |
| `POST` | `/products/:productId/variants` | Tạo variant | Admin |
| `PATCH` | `/variants/:id` | Cập nhật variant | Admin |
| `DELETE` | `/variants/:id` | Soft delete variant | Admin |

---

#### `GET /products/:productId/variants` — Danh sách variants

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": 1,
      "product_id": 42,
      "sku": "IP15-128-BLK",
      "price": 22000000,
      "compare_price": 24000000,
      "weight": 0.171,
      "attributes": [
        { "code": "color", "value": "black" },
        { "code": "storage", "value": "128GB" }
      ],
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `POST /products/:productId/variants` — Tạo variant

> **Auth:** Admin

**Request Body:**

```json
{
  "sku": "IP15-128-BLK",
  "price": 22000000,
  "compare_price": 24000000,
  "weight": 0.171,
  "attributeValueIds": [1, 3]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `sku` | `string` | ✅ | `maxLength: 100`, unique |
| `price` | `number` | ✅ | `decimal(15,2)`, positive |
| `compare_price` | `number` | ❌ | `decimal(15,2)` — giá gốc trước khi giảm |
| `weight` | `number` | ❌ | `decimal(10,3)` — đơn vị kg |
| `attributeValueIds` | `number[]` | ❌ | Danh sách ID attribute values |

**Response `201 Created`:**

```json
{
  "message": "Variant created successfully",
  "data": {
    "id": 1,
    "product_id": 42,
    "sku": "IP15-128-BLK",
    "price": 22000000,
    "compare_price": 24000000,
    "weight": 0.171,
    "created_at": "2026-03-06T02:30:00.000Z"
  }
}
```

---

#### `PATCH /variants/:id` — Cập nhật variant

> **Auth:** Admin

> ⚠️ **Ghi chú quan trọng:** Khi `price` thay đổi, hệ thống tự động ghi vào bảng `price_history` (old_price, new_price, changed_at).

**Request Body** (tất cả optional):

```json
{
  "price": 20000000,
  "compare_price": 22000000,
  "weight": 0.171
}
```

---

#### `GET /variants/:id/price-history` — Lịch sử giá

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": 5,
      "variant_id": 1,
      "old_price": 24000000,
      "new_price": 22000000,
      "changed_by": "admin@example.com",
      "changed_at": "2026-02-01T08:00:00Z"
    },
    {
      "id": 3,
      "variant_id": 1,
      "old_price": 25000000,
      "new_price": 24000000,
      "changed_by": "admin@example.com",
      "changed_at": "2026-01-15T08:00:00Z"
    }
  ]
}
```

---

### 7.6 Images

#### Endpoints Overview

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `GET` | `/products/:productId/images` | Danh sách ảnh sản phẩm | Public |
| `POST` | `/products/:productId/images` | Thêm ảnh | Admin |
| `PATCH` | `/images/:id` | Cập nhật ảnh | Admin |
| `PATCH` | `/images/:id/set-primary` | Đặt ảnh làm primary | Admin |
| `DELETE` | `/images/:id` | Xóa ảnh | Admin |

---

#### `GET /products/:productId/images`

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": 1,
      "product_id": 42,
      "variant_id": null,
      "url": "https://cdn.example.com/iphone-15-front.jpg",
      "alt_text": "iPhone 15 mặt trước",
      "position": 0,
      "is_primary": true
    },
    {
      "id": 2,
      "product_id": 42,
      "variant_id": 1,
      "url": "https://cdn.example.com/iphone-15-black.jpg",
      "alt_text": "iPhone 15 màu đen",
      "position": 1,
      "is_primary": false
    }
  ]
}
```

---

#### `POST /products/:productId/images` — Thêm ảnh

> **Auth:** Admin

**Request Body:**

```json
{
  "url": "https://cdn.example.com/iphone-15-back.jpg",
  "alt_text": "iPhone 15 mặt sau",
  "position": 2,
  "is_primary": false,
  "variant_id": null
}
```

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `url` | `string` | ✅ | URL ảnh, `maxLength: 1000` |
| `alt_text` | `string` | ❌ | Alt text SEO, `maxLength: 500` |
| `position` | `number` | ❌ | Thứ tự hiển thị. Default: `0` |
| `is_primary` | `boolean` | ❌ | Ảnh đại diện. Default: `false` |
| `variant_id` | `number` | ❌ | Gắn với variant cụ thể. `null` = ảnh chung |

---

#### `PATCH /images/:id/set-primary` — Đặt ảnh primary

**Response `200 OK`:**

```json
{
  "message": "Primary image updated successfully"
}
```

---

### 7.7 Search & Filter

#### `GET /search` — Tìm kiếm sản phẩm

Kết hợp full-text search + faceted filter sử dụng `product_filter_index` và `variant_flattened`.

**Query Parameters:**

| Param | Type | Mô tả |
|-------|------|-------|
| `q` | `string` | Từ khóa tìm kiếm (full-text GIN index trên `tsvector`) |
| `category_id` | `number` | Lọc theo danh mục (bao gồm danh mục con qua `path LIKE`) |
| `brand_id` | `number` | Lọc theo thương hiệu |
| `min_price` | `number` | Giá tối thiểu |
| `max_price` | `number` | Giá tối đa |
| `color` | `string` | Màu sắc |
| `size` | `string` | Kích cỡ |
| `storage` | `string` | Dung lượng |
| `page` | `number` | Trang (default: 1) |
| `limit` | `number` | Số lượng/trang (default: 20, max: 100) |
| `sort` | `string` | `price_asc` \| `price_desc` \| `name_asc` \| `created_at_desc` |

**Response `200 OK`:**

```json
{
  "data": [ /* array of products (same format as GET /products) */ ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

#### `GET /search/facets` — Facet metadata

Trả về danh sách các giá trị filter khả dụng cho UI hiển thị filter panel.

**Query Parameters:** Tương tự `GET /search` (dùng để lọc phạm vi facets theo context hiện tại)

**Response `200 OK`:**

```json
{
  "brands": [
    { "id": 1, "name": "Apple", "count": 48 },
    { "id": 2, "name": "Samsung", "count": 35 }
  ],
  "categories": [
    { "id": 12, "name": "Smartphone", "count": 80 }
  ],
  "colors": [
    { "value": "black", "count": 60 },
    { "value": "white", "count": 45 }
  ],
  "sizes": [
    { "value": "S", "count": 20 },
    { "value": "M", "count": 35 }
  ],
  "storages": [
    { "value": "128GB", "count": 40 },
    { "value": "256GB", "count": 25 }
  ],
  "priceRange": {
    "min": 500000,
    "max": 60000000
  }
}
```

---

### 7.8 Health Check

#### `GET /health/live` — Liveness Probe

Kiểm tra service có đang chạy không (dùng cho Kubernetes liveness probe).

**Response `200 OK`:**

```json
{
  "status": "ok"
}
```

---

#### `GET /health/ready` — Readiness Probe

Kiểm tra DB + Redis có sẵn sàng nhận traffic không (dùng cho Kubernetes readiness probe).

**Response `200 OK`:**

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

**Response `503 Service Unavailable`** (khi DB hoặc Redis down):

```json
{
  "status": "error",
  "error": {
    "database": { "status": "down", "message": "Connection refused" }
  }
}
```

---

## 8. Data Models

### Product

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | `bigint` | Primary key (auto-increment) |
| `name` | `varchar(500)` | Tên sản phẩm |
| `slug` | `varchar(500)` | URL-friendly identifier, unique |
| `brand_id` | `bigint` | FK → `brands.id` |
| `description` | `text` | Mô tả chi tiết |
| `status` | `enum` | `active` \| `draft`. Default: `draft` |
| `created_at` | `timestamp` | Thời điểm tạo |
| `updated_at` | `timestamp` | Thời điểm cập nhật |
| `deleted_at` | `timestamp` | `null` = active; có giá trị = soft-deleted |

### ProductVariant

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | `bigint` | PK |
| `product_id` | `bigint` | FK → `products.id` |
| `sku` | `varchar(100)` | Stock Keeping Unit, unique |
| `price` | `decimal(15,2)` | Giá bán |
| `compare_price` | `decimal(15,2)` | Giá gốc (để hiển thị giảm giá) |
| `weight` | `decimal(10,3)` | Trọng lượng (kg) |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |
| `deleted_at` | `timestamp` | Soft delete |

### Brand

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | `bigint` | PK |
| `name` | `varchar(255)` | Tên thương hiệu |
| `slug` | `varchar(255)` | Unique slug |
| `logo` | `varchar(500)` | URL logo |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |
| `deleted_at` | `timestamp` | Soft delete |

### Category

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | `bigint` | PK |
| `name` | `varchar(255)` | Tên danh mục |
| `slug` | `varchar(255)` | Unique slug |
| `parent_id` | `bigint` | FK → `categories.id`. `null` = root |
| `path` | `varchar(500)` | Materialized path VD: `"1/5/12/"` |
| `depth` | `int` | Độ sâu. Root = `0` |

### Attribute

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | `bigint` | PK |
| `name` | `varchar(255)` | Tên hiển thị VD: "Màu sắc" |
| `code` | `varchar(100)` | Code unique VD: `"color"` |
| `type` | `varchar(50)` | `text` \| `number` \| `color` |

### ProductImage

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | `bigint` | PK |
| `product_id` | `bigint` | FK NOT NULL |
| `variant_id` | `bigint` | FK nullable. `null` = ảnh chung |
| `url` | `varchar(1000)` | URL ảnh |
| `alt_text` | `varchar(500)` | Alt text |
| `position` | `int` | Thứ tự hiển thị. Default: `0` |
| `is_primary` | `boolean` | Ảnh đại diện. Default: `false` |

---

## 9. Cache Strategy

Service sử dụng **Cache-Aside pattern** với Redis.

### Cache Keys

| Cache Key | TTL | Mô tả |
|-----------|-----|-------|
| `product:{id}` | 3600s (1h) | Chi tiết sản phẩm theo ID |
| `product:slug:{slug}` | 3600s (1h) | Chi tiết sản phẩm theo slug |
| `products:list:{hash(query)}` | 300s (5 phút) | Danh sách có filter/paging |
| `brands:all` | 7200s (2h) | Toàn bộ brands |
| `categories:tree` | 7200s (2h) | Cây danh mục |
| `variant:{id}` | 3600s (1h) | Chi tiết variant |
| `search:facets:{hash(query)}` | 600s (10 phút) | Facet metadata |

### Cache Invalidation

| Event | Keys bị xóa |
|-------|------------|
| `POST /products` | `products:list:*` |
| `PATCH /products/:id` | `product:{id}`, `product:slug:{slug}`, `products:list:*` |
| `DELETE /products/:id` | `product:{id}`, `product:slug:{slug}`, `products:list:*` |
| `PATCH /variants/:id` | `variant:{id}`, `product:{product_id}` |
| `POST /brands` | `brands:all` |
| `POST /categories` | `categories:tree` |

---

## 10. Implementation Status

> Tài liệu mô tả toàn bộ API theo thiết kế trong FSD. Trạng thái hiện tại:

| Module | Endpoint | Trạng thái |
|--------|----------|-----------|
| **Products** | `POST /products` | ✅ Implemented |
| **Products** | `GET /products` | 🔲 Planned |
| **Products** | `GET /products/:id` | 🔲 Planned |
| **Products** | `GET /products/slug/:slug` | 🔲 Planned |
| **Products** | `PATCH /products/:id` | 🔲 Planned |
| **Products** | `DELETE /products/:id` | 🔲 Planned |
| **Products** | `POST /products/:id/restore` | 🔲 Planned |
| **Products** | `PATCH /products/:id/publish` | 🔲 Planned |
| **Products** | `PATCH /products/:id/unpublish` | 🔲 Planned |
| **Brands** | All endpoints | 🔲 Planned |
| **Categories** | All endpoints | 🔲 Planned |
| **Attributes** | All endpoints | 🔲 Planned |
| **Variants** | All endpoints | 🔲 Planned |
| **Images** | All endpoints | 🔲 Planned |
| **Search** | All endpoints | 🔲 Planned |
| **Health** | `/health/live`, `/health/ready` | 🔲 Planned |

> ✅ Implemented · 🔲 Planned · ⚙️ In Progress

---

*Tài liệu này được tổng hợp từ [RSD.md](./RSD.md) và [FSD.md](./FSD.md). Cập nhật khi có thay đổi spec.*
