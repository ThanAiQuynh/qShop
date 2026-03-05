# Requirements Specification Document (RSD)
## product-catalog-service — qShop

**Phiên bản:** 1.0  
**Ngày:** 06/03/2026  
**Tác giả:** qShop Team  
**Trạng thái:** Draft

---

## Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [Phạm vi hệ thống](#2-phạm-vi-hệ-thống)
3. [Các bên liên quan](#3-các-bên-liên-quan)
4. [Yêu cầu chức năng (Functional Requirements)](#4-yêu-cầu-chức-năng)
5. [Yêu cầu phi chức năng (Non-Functional Requirements)](#5-yêu-cầu-phi-chức-năng)
6. [Yêu cầu hệ thống & hạ tầng](#6-yêu-cầu-hạ-tầng)
7. [Ràng buộc & giả định](#7-ràng-buộc--giả-định)
8. [Bảng thuật ngữ](#8-bảng-thuật-ngữ)

---

## 1. Giới thiệu

### 1.1 Mục đích tài liệu

Tài liệu này xác định toàn bộ các yêu cầu (chức năng và phi chức năng) cho microservice `product-catalog-service` thuộc hệ thống thương mại điện tử **qShop**. Tài liệu phục vụ làm căn cứ để thiết kế, phát triển, kiểm thử và nghiệm thu hệ thống.

### 1.2 Tầm nhìn sản phẩm

`product-catalog-service` là một microservice độc lập, chịu trách nhiệm **quản lý toàn bộ vòng đời của sản phẩm** trong hệ thống qShop:

- Quản lý thông tin sản phẩm (products, variants/SKU)
- Quản lý thương hiệu (brands)
- Quản lý danh mục dạng cây (category tree)
- Quản lý thuộc tính và giá trị (attributes, attribute values)
- Hỗ trợ tìm kiếm và lọc sản phẩm tốc độ cao (faceted search)
- Phục vụ hàng ngàn người dùng đồng thời với độ trễ thấp

### 1.3 Liên kết tài liệu

| Tài liệu | Đường dẫn |
|----------|-----------|
| ERD Database | `docs/product_catalog_erd.md` |
| Kế hoạch Performance & Reliability | `docs/PERFORMANCE_RELIABILITY_PLAN.md` |
| Hướng dẫn Setup | `docs/SETUP.md` |
| Cấu trúc dự án | `docs/structure.md` |

---

## 2. Phạm vi hệ thống

### 2.1 Trong phạm vi (In-scope)

| STT | Chức năng |
|-----|-----------|
| 1 | Quản lý CRUD sản phẩm (Product) |
| 2 | Quản lý Variant / SKU của sản phẩm |
| 3 | Quản lý thương hiệu (Brand) |
| 4 | Quản lý danh mục dạng cây (Category tree) |
| 5 | Quản lý thuộc tính (Attribute) và giá trị thuộc tính (Attribute Value) |
| 6 | Quản lý hình ảnh sản phẩm (Product Images) |
| 7 | Tìm kiếm và lọc sản phẩm (Search & Faceted Filter) |
| 8 | Theo dõi lịch sử giá (Price History) |
| 9 | Lưu trữ sản phẩm đã xóa (Product Archive) |
| 10 | Phân trang danh sách sản phẩm |
| 11 | Soft Delete với cơ chế grace period 30 ngày |
| 12 | Health check endpoints (liveness, readiness) |
| 13 | Caching với Redis (Cache-Aside pattern) |

### 2.2 Ngoài phạm vi (Out-of-scope)

| STT | Chức năng | Ghi chú |
|-----|-----------|---------|
| 1 | Quản lý đơn hàng | Thuộc `order-service` |
| 2 | Quản lý người dùng / xác thực | Thuộc `auth-service` / `user-service` |
| 3 | Quản lý tồn kho chi tiết | Thuộc `inventory-service` |
| 4 | Thanh toán | Thuộc `payment-service` |
| 5 | Full-text Search nâng cao | Elasticsearch/OpenSearch (giai đoạn sau) |
| 6 | Giao diện người dùng (Frontend) | Thuộc dự án frontend riêng |

---

## 3. Các bên liên quan

| Vai trò | Trách nhiệm |
|---------|-------------|
| **Backend Developer** | Phát triển và bảo trì service |
| **Database Admin** | Quản lý schema, migration, indexing |
| **DevOps Engineer** | CI/CD, Docker, deployment |
| **API Consumer** (các service khác) | Frontend, Order Service, Search Service |
| **Product Manager** | Xác định business rules |

---

## 4. Yêu cầu chức năng

### 4.1 Quản lý Sản phẩm (Product Management)

#### FR-P-01: Tạo sản phẩm
- Hệ thống phải cho phép tạo mới một sản phẩm với các trường: `name`, `slug`, `brand_id`, `description`, `status` (active/draft).
- `slug` phải là duy nhất trong toàn hệ thống.
- Trạng thái mặc định khi tạo là `draft`.

#### FR-P-02: Cập nhật sản phẩm
- Hệ thống phải cho phép cập nhật các thông tin của sản phẩm hiện có.
- Sau khi cập nhật, cache liên quan phải được invalidate ngay lập tức.

#### FR-P-03: Xem thông tin sản phẩm
- Hệ thống phải cho phép lấy thông tin chi tiết một sản phẩm qua `id` hoặc `slug`.
- Kết quả bao gồm: thông tin sản phẩm, danh sách variants, hình ảnh, danh mục.

#### FR-P-04: Danh sách sản phẩm (có phân trang)
- Hệ thống phải hỗ trợ lấy danh sách sản phẩm với phân trang (`page`, `limit`).
- Hỗ trợ lọc: theo `brand_id`, `category_id`, `status`, `price range`.
- Hỗ trợ sắp xếp theo: `created_at`, `price`, `name`.

#### FR-P-05: Xóa sản phẩm (Soft Delete + Archive)
- Xóa sản phẩm sẽ thực hiện **Soft Delete** (set `deleted_at = NOW()`).
- Sau 30 ngày grace period, hệ thống tự động:
  1. Đóng gói toàn bộ dữ liệu sản phẩm vào JSON.
  2. Lưu vào bảng `product_archives`.
  3. Xóa vĩnh viễn (Hard Delete) khỏi bảng chính.

#### FR-P-06: Khôi phục sản phẩm
- Trong vòng 30 ngày grace period, sản phẩm có thể được khôi phục (set `deleted_at = NULL`).

#### FR-P-07: Publish/Unpublish sản phẩm
- Hệ thống phải cho phép chuyển trạng thái sản phẩm giữa `active` và `draft`.

---

### 4.2 Quản lý Variant / SKU

#### FR-V-01: Tạo variant
- Mỗi variant gắn với một `product_id`, có `sku` (unique), `price`, `compare_price`, `weight`.

#### FR-V-02: Cập nhật variant
- Cho phép cập nhật giá, trọng lượng của variant.
- Khi giá thay đổi, hệ thống phải ghi nhận vào bảng `price_history` (old_price, new_price, changed_at).

#### FR-V-03: Xem variants của sản phẩm
- Lấy toàn bộ variants của một product, bao gồm thông tin attribute value của từng variant.

#### FR-V-04: Xóa variant
- Soft delete variant. Grace period và archive tương tự sản phẩm.

---

### 4.3 Quản lý Thương hiệu (Brand)

#### FR-B-01: CRUD thương hiệu
- Tạo, đọc, cập nhật, xóa (soft) thương hiệu.
- Thương hiệu có: `name`, `slug` (unique), `logo`.

#### FR-B-02: Danh sách thương hiệu
- Lấy toàn bộ danh sách thương hiệu đang active.

---

### 4.4 Quản lý Danh mục (Category)

#### FR-C-01: CRUD danh mục
- Tạo, đọc, cập nhật, xóa (soft) danh mục.
- Danh mục có cấu trúc cây: `parent_id`, `path` (Materialized Path, VD: `"1/5/12/"`), `depth`.

#### FR-C-02: Lấy cây danh mục
- Hỗ trợ lấy toàn bộ cây con của một danh mục bằng query `LIKE '1/%'` trên trường `path`.

#### FR-C-03: Lấy sản phẩm theo danh mục
- Lấy tất cả sản phẩm thuộc một danh mục (bao gồm cả danh mục con).

---

### 4.5 Quản lý Thuộc tính (Attribute)

#### FR-A-01: CRUD attribute
- Quản lý các loại attribute: `color`, `size`, `storage`, ...
- Mỗi attribute có: `name`, `code` (unique), `type`.

#### FR-A-02: CRUD attribute value
- Quản lý các giá trị của từng attribute: VD color → `black`, `white`.

#### FR-A-03: Gán attribute cho variant
- Gán danh sách attribute values cho một variant (bảng `variant_attributes`).

---

### 4.6 Quản lý Hình ảnh (Product Images)

#### FR-I-01: Thêm hình ảnh
- Thêm hình ảnh cho sản phẩm hoặc gắn với một variant cụ thể.
- Trường: `url`, `alt_text`, `position`, `is_primary`.

#### FR-I-02: Sắp xếp / đặt ảnh chính
- Cho phép đặt ảnh primary và sắp xếp thứ tự hiển thị.

#### FR-I-03: Xóa hình ảnh
- Soft delete hình ảnh.

---

### 4.7 Tìm kiếm & Lọc sản phẩm

#### FR-S-01: Lọc sản phẩm (Faceted Filter)
- Lọc sản phẩm theo: `category`, `brand`, `price range`, `color`, `size`, `storage`.
- Sử dụng bảng `product_filter_index` và `variant_flattened` để đảm bảo tốc độ.

#### FR-S-02: Full-text Search (giai đoạn đầu)
- Tìm kiếm theo tên sản phẩm (ILIKE / GIN index trên `tsvector`).

#### FR-S-03: Facet metadata
- API trả về danh sách các giá trị filter khả dụng (colors, sizes, price range) cho UI hiển thị filter panel.

---

### 4.8 Lịch sử Giá (Price History)

#### FR-PH-01: Ghi nhận thay đổi giá
- Mỗi khi giá variant thay đổi, ghi vào `price_history`: `old_price`, `new_price`, `changed_by`, `changed_at`.

#### FR-PH-02: Xem lịch sử giá
- Lấy toàn bộ lịch sử giá của một variant, sắp xếp theo `changed_at DESC`.

---

### 4.9 Health Check

#### FR-H-01: Liveness probe
- `GET /api/v1/health/live` → trả về HTTP 200 nếu service đang chạy.

#### FR-H-02: Readiness probe
- `GET /api/v1/health/ready` → trả về HTTP 200 nếu DB và Redis sẵn sàng nhận traffic.

---

## 5. Yêu cầu phi chức năng

### 5.1 Hiệu suất (Performance)

| Chỉ số | Yêu cầu |
|--------|---------|
| Cache hit latency | < 10ms |
| Cache miss latency (DB + populate cache) | < 50ms (với index tối ưu) |
| Danh sách sản phẩm phân trang | < 100ms p95 |
| Throughput | Hỗ trợ hàng ngàn concurrent requests trên 1 instance |

### 5.2 Độ tin cậy (Reliability)

| Yêu cầu | Mô tả |
|---------|-------|
| **Retry mechanism** | Retry khi DB/external service lỗi với exponential backoff (100ms → 200ms → 400ms, tối đa 5 lần) |
| **Circuit breaker** | Khi dependency lỗi nhiều → mở circuit, trả fallback |
| **Timeout** | HTTP outbound timeout: 5–10 giây |
| **Graceful shutdown** | Xử lý `SIGTERM`/`SIGINT`, chờ request hiện tại hoàn thành (timeout 10–15s) |
| **Global validation** | Sử dụng `class-validator` + `ValidationPipe` để validate mọi input |

### 5.3 Bảo mật (Security)

| Yêu cầu | Mô tả |
|---------|-------|
| **Rate Limiting** | Sử dụng `@nestjs/throttler` để chống burst traffic |
| **Input Validation** | Validate toàn bộ request body, query params |
| **Environment Secrets** | Credentials lưu trong biến môi trường, không hardcode |

### 5.4 Khả năng mở rộng (Scalability)

| Yêu cầu | Mô tả |
|---------|-------|
| **Stateless** | Service không lưu session/state trong memory |
| **Horizontal scaling** | Có thể deploy nhiều instance song song |
| **12-Factor App** | Config từ biến môi trường, không phụ thuộc môi trường cụ thể |
| **Docker-ready** | Có Dockerfile multi-stage với Alpine image |

### 5.5 Observability

| Yêu cầu | Mô tả |
|---------|-------|
| **Structured logging** | JSON format với Winston/Pino |
| **Correlation ID** | Request ID đính kèm trong mọi log (AsyncLocalStorage) |
| **Health endpoints** | `/health/live` và `/health/ready` |
| **Memory monitoring** | Cảnh báo khi heap vượt ~1.5 GB |

### 5.6 Dữ liệu

| Yêu cầu | Mô tả |
|---------|-------|
| **Soft Delete** | Mọi xóa đều là soft delete trước; hard delete sau 30 ngày |
| **Audit trail** | `product_archives` lưu dữ liệu JSON trước khi hard delete |
| **Price audit** | `price_history` ghi nhận mọi thay đổi giá |

---

## 6. Yêu cầu hạ tầng

### 6.1 Công nghệ bắt buộc

| Thành phần | Công nghệ | Phiên bản tối thiểu |
|-----------|-----------|----------------------|
| Runtime | Node.js | 20.x LTS |
| Framework | NestJS | 10.x |
| ORM | Drizzle ORM | Latest |
| Database | PostgreSQL | 15+ |
| Cache | Redis | 6+ |
| Package manager | pnpm | 8.x |
| Container | Docker | 24+ |

### 6.2 Cấu hình tài nguyên (Resource Limits)

| Tham số | Giá trị |
|---------|---------|
| Node heap size | `--max-old-space-size=2048` (2 GB) |
| DB connection pool | 10–15 connections |
| Redis maxmemory | 256 MB – 512 MB |
| Instance count (dev) | 1 |

### 6.3 Biến môi trường bắt buộc

| Biến | Mô tả |
|------|-------|
| `PORT` | Port service lắng nghe (default: 3000) |
| `NODE_ENV` | Môi trường: `development` / `production` / `test` |
| `DATABASE_URL` | PostgreSQL connection string (bắt buộc) |
| `REDIS_URL` | Redis connection URL (default: `redis://localhost:6379`) |
| `LOG_LEVEL` | Log level: `error` / `warn` / `info` / `debug` |

---

## 7. Ràng buộc & Giả định

### 7.1 Ràng buộc kỹ thuật

- Service chỉ sử dụng PostgreSQL làm nguồn dữ liệu gốc (Single Source of Truth).
- Redis chỉ đóng vai trò cache, không phải storage chính.
- Mọi thay đổi dữ liệu phải invalidate cache tương ứng ngay lập tức.
- Full-text search nâng cao (Elasticsearch) sẽ được implement ở giai đoạn sau như một ETL pipeline song song.

### 7.2 Giả định

- Các service khác (order, user, payment) sẽ giao tiếp qua REST API.
- Authentication/Authorization được xử lý bởi API Gateway hoặc `auth-service` (ngoài phạm vi service này).
- Hệ thống chạy trên môi trường phát triển với cấu hình: AMD Ryzen 5 5500U, 8 GB RAM, SSD 477 GB.

---

## 8. Bảng thuật ngữ

| Thuật ngữ | Định nghĩa |
|----------|-----------|
| **Product** | Sản phẩm gốc (ví dụ: iPhone 15) |
| **Variant / SKU** | Biến thể cụ thể của sản phẩm (ví dụ: iPhone 15 màu đen, 128GB) |
| **Brand** | Thương hiệu sản phẩm (ví dụ: Apple, Nike) |
| **Category** | Danh mục sản phẩm dạng cây (ví dụ: Electronics > Phone > Smartphone) |
| **Attribute** | Loại thuộc tính (ví dụ: color, size, storage) |
| **Attribute Value** | Giá trị của thuộc tính (ví dụ: black, 128GB) |
| **Faceted Search** | Tìm kiếm kết hợp nhiều bộ lọc đồng thời |
| **Soft Delete** | Đánh dấu xóa bằng `deleted_at`, dữ liệu vẫn còn trong DB |
| **Hard Delete** | Xóa vĩnh viễn khỏi DB |
| **Cache-Aside** | Pattern: đọc cache trước; miss → đọc DB → ghi vào cache |
| **Grace Period** | Thời gian 30 ngày giữa Soft Delete và Hard Delete |
| **Materialized Path** | Chiến lược lưu cây danh mục bằng chuỗi path (VD: `"1/5/12/"`) |
| **KPI** | Key Performance Indicator — chỉ số đo lường hiệu suất |
| **p95** | Phần trăm thứ 95 của độ trễ (95% request dưới giá trị này) |
