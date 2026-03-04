# Kế hoạch Tối ưu hóa Hiệu suất và Độ tin cậy
## product-catalog-service — Hệ thống Phân tán

**Phiên bản:** 2.0  
**Ngày:** 03/03/2025  
**Cấu hình mục tiêu:** Acer Aspire 7 — AMD Ryzen 5 5500U (6 nhân 12 luồng), 8 GB RAM, SSD 477 GB

---

## 0. Tầm nhìn

`product-catalog-service` không chỉ là ứng dụng CRUD thông thường. Đây là **bài tập thực hành** về **Performance & Reliability Optimization** trong hệ thống phân tán — thiết kế để phục vụ hàng ngàn người dùng đồng thời trên một máy chủ, với kiến trúc sẵn sàng mở rộng lên Cloud.

### Bảng tóm tắt mục tiêu (KPI)

| Thành phần | Công nghệ | Chỉ số tối ưu (KPI) |
|------------|-----------|----------------------|
| **Giao diện lập trình** | NestJS | Cấu trúc Module rõ ràng, dễ bảo trì |
| **Truy xuất dữ liệu** | Redis | Giảm Latency xuống **dưới 10ms** |
| **Lưu trữ dữ liệu** | PostgreSQL | Tối ưu Query thông qua **Index** |
| **Triển khai** | Docker | Cô lập môi trường, mở rộng **horizontal scaling** |

---

## 1. Ba trụ cột tối ưu

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TRỤ CỘT 1: Latency          TRỤ CỘT 2: Throughput     TRỤ CỘT 3: Scale │
│  Tốc độ phản hồi             Khả năng chịu tải         Sẵn sàng mở rộng  │
│  • Redis Cache-Aside         • Connection Pooling      • Stateless       │
│  • DB Indexing               • Async Non-blocking      • Docker Alpine   │
│  • <10ms từ cache            • Resource limits (8GB)   • Cloud-ready     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Trụ cột 1 — Tối ưu Tốc độ phản hồi (Latency Optimization)

**Mục tiêu:** Phản hồi nhanh "như chớp" bất kể dữ liệu lớn đến đâu.

### 2.1 Caching với Redis (Cache-Aside)

| So sánh | Database (Disk I/O) | Redis (RAM) |
|---------|---------------------|-------------|
| **Latency** | ~100ms | **<5ms** |
| **Use case** | Nguồn dữ liệu gốc | Hot data, đọc nhiều |

**Chiến lược Cache-Aside:**
- **Đọc:** Nếu có trong Redis → trả về; nếu không → query DB → ghi vào Redis → trả về
- **Ghi:** Cập nhật DB trước → **invalidate** cache (xóa key) → lần đọc tiếp theo sẽ load fresh từ DB
- **Invalidation:** Khi `ProductCreated`, `ProductUpdated`, `ProductDeleted` → xóa cache tương ứng
- **Gợi ý tối ưu:** 
  - Luôn đặt **TTL (Time-To-Live)** (ví dụ: 1h) cho mọi key để tránh rác dữ liệu.
  - Chỉ cache **Hot data** (các sản phẩm/danh mục truy cập nhiều) để tiết kiệm RAM.

```bash
npm i @nestjs/cache-manager cache-manager cache-manager-redis-store
# hoặc: ioredis + @nestjs/cache-manager
```

### 2.2 Database Indexing (PostgreSQL)

- Tối ưu cấu trúc bảng để tìm kiếm trong **hàng triệu dòng** mà không quá tải CPU
- **Single-column index:** `id`, `slug`, `category_id`
- **Composite index:** cho query phổ biến — ví dụ `(category_id, created_at DESC)` cho danh sách sản phẩm theo danh mục
- **GIN index:** cho tìm kiếm Full-text trên tên/mô tả sản phẩm (`tsvector`)
- **Phân tích:** Sử dụng `EXPLAIN ANALYZE` để kiểm chứng hiệu quả của index.

### 2.3 KPI Latency

| Chỉ số | Mục tiêu |
|--------|----------|
| Cache hit | < 10ms |
| Cache miss (DB + populate cache) | < 50ms (đã tối ưu index) |
| List products (paginated) | < 100ms p95 |

---

## 3. Trụ cột 2 — Tối ưu Khả năng chịu tải (Throughput Optimization)

**Mục tiêu:** Một máy chủ phục vụ hàng ngàn request đồng thời nhờ CPU Ryzen 5 (6 nhân 12 luồng).

### 3.1 Connection Pooling (PostgreSQL)

- Tối ưu kết nối NestJS ↔ PostgreSQL
- Tránh "cạn kiệt" cổng khi có quá nhiều request
- **Pool size:** 10–15 (phù hợp 8 GB RAM)

```ts
// TypeORM / pg
{
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}
```

### 3.2 Asynchronous Processing (Non-blocking)

- Tận dụng event loop Node.js — không block các request khác
- Tác vụ nặng (export CSV, generate report): chuyển sang Queue (Bull/BullMQ) hoặc worker
- Tránh `sync` operations, CPU-bound blocks

### 3.3 Resource Constraints (8 GB RAM)

| Tham số | Giá trị | Lý do |
|---------|---------|-------|
| **Node heap** | `--max-old-space-size=2048` | ~2 GB, còn RAM cho Redis, Postgres, OS |
| **Redis maxmemory** | 256 MB – 512 MB | Tiết kiệm RAM cho cấu hình 8GB |
| **DB pool** | 10–15 | Giới hạn kết nối |
| **Instance local** | 1 | Để dành RAM cho Docker Desktop và OS |

> [!WARNING]
> Trên Windows với 8GB RAM, Docker Desktop có thể chiếm 2-3GB. Nếu hệ thống chậm, hãy cân nhắc chạy Redis/Postgres trực tiếp trên WSL2 hoặc Windows thay vì Container trong lúc phát triển.

### 3.4 Rate Limiting (`@nestjs/throttler`)

- Bảo vệ khỏi burst traffic
- Giảm nguy cơ crash khi RAM hạn chế

---

## 4. Trụ cột 3 — Tối ưu Khả năng mở rộng (Scalability Readiness)

**Mục tiêu:** Thiết kế "sẵn sàng lên mây" — dù hiện tại chỉ 1 instance.

### 4.1 Stateless Design

- **Không** lưu session/state trong bộ nhớ của service
- Session → Redis hoặc JWT stateless
- Cho phép nhân bản 10, 100 instance mà không sai lệch dữ liệu

### 4.2 Dockerization (Alpine)

- **Base image:** `node:20-alpine` — kích thước nhỏ
- Multi-stage build: build → copy `dist/` → chạy production
- Lợi ích: deploy nhanh, ít băng thông, dễ scale ngang

```dockerfile
# Ví dụ cấu trúc
FROM node:20-alpine AS builder
# ... build

FROM node:20-alpine
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/main"]
```

### 4.3 Cloud-ready Checklist

- [ ] Config từ biến môi trường (12-factor)
- [ ] Health checks: Phân biệt `/health/live` (Liveness) và `/health/ready` (Readiness)
- [ ] Graceful shutdown: Xử lý `SIGTERM` để đóng kết nối an toàn
- [ ] Logging structured: JSON format + Request ID (Correlation ID) cho tracing.

---

## 5. Nền tảng bổ trợ (Foundation)

### 5.1 Health checks (`@nestjs/terminus`)

| Endpoint | Mô tả |
|----------|-------|
| `/health/live` | Service còn sống |
| `/health/ready` | DB, Redis sẵn sàng nhận traffic |
| Memory check | Cảnh báo khi heap > ~1.5 GB |

### 5.2 Graceful shutdown

- Bắt `SIGTERM`, `SIGINT`
- Chờ request hiện tại (timeout 10–15s)
- Đóng DB, Redis, kết nối

### 5.3 Config (`@nestjs/config`)

- `.env` + biến: `PORT`, `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `LOG_LEVEL`

---

## 6. Độ tin cậy (Reliability)

### 6.1 Retry + Exponential backoff

- Retry khi gọi DB/external service thất bại
- 100ms → 200ms → 400ms, max 3–5 lần

### 6.2 Circuit breaker

- Khi dependency lỗi nhiều → mở circuit, trả fallback
- Thư viện: `opossum`

### 6.3 Timeout

- HTTP outbound: 5–10s
- Tránh request treo, ổn định heap

### 6.4 Structured logging + Observability

- Winston/Pino, correlation ID (sử dụng `AsyncLocalStorage`) cho distributed tracing.
- Global Validation: Sử dụng `class-validator` + `ValidationPipe` để đảm bảo độ tin cậy của đầu vào.

---

## 7. Roadmap thực hiện

```
Tuần 1:     Foundation — Health, Config, Graceful shutdown
Tuần 2:     Trụ cột 1 — Redis Cache-Aside, PostgreSQL + Indexing
Tuần 3:     Trụ cột 2 — Connection pool, Throttler, Resource limits
Tuần 4:     Trụ cột 3 — Stateless, Docker Alpine
Tuần 5+:    Reliability — Retry, Circuit breaker, Logging
Tuần 6:     Verification — Load Test (k6/autocannon), Benchmarking
```

---

## 8. Checklist triển khai

### Foundation
- [ ] Cài `@nestjs/terminus`, `/health/live`, `/health/ready`
- [ ] Cài `@nestjs/config`, `.env.example`
- [ ] Graceful shutdown trong `main.ts`
- [ ] `NODE_OPTIONS=--max-old-space-size=2048` trong scripts

### Trụ cột 1 — Latency
- [ ] Cài Redis + `@nestjs/cache-manager` (hoặc `cache-manager-redis-store`)
- [ ] Implement Cache-Aside: đọc cache trước, miss → DB → populate cache
- [ ] Thiết lập **TTL** cho cache keys
- [ ] Cache invalidation khi Create/Update/Delete product
- [ ] KPI: Latency < 10ms từ cache
- [ ] PostgreSQL + indexes (single, composite, **GIN index** cho Full-text)

### Trụ cột 2 — Throughput
- [ ] Connection pooling (pool size 10–15)
- [ ] Cài `@nestjs/throttler`
- [ ] Async cho tác vụ nặng (nếu có)
- [ ] Cấu hình resource limits (heap, Redis maxmemory)

### Trụ cột 3 — Scalability
- [ ] Kiểm tra stateless (không lưu session trong memory)
- [ ] Dockerfile multi-stage, Alpine
- [ ] `.dockerignore` để giảm build context

### Reliability
- [ ] Registry **Correlation ID** (Request ID) vào log
- [ ] Cài đặt **Global ValidationPipe**
- [ ] Retry + backoff cho DB/external calls
- [ ] Circuit breaker
- [ ] Timeout HTTP client
- [ ] Structured logging
- [ ] **Load Test** (k6/autocannon) & Benchmarking

---

## 9. Tài liệu tham khảo

- [NestJS Caching](https://docs.nestjs.com/techniques/caching)
- [NestJS Best Practices](https://docs.nestjs.com/techniques/performance)
- [PostgreSQL Indexing](https://www.postgresql.org/docs/current/indexes.html)
- [Node.js Production Checklist](https://github.com/goldbergyoni/nodebestpractices)
- [The Twelve-Factor App](https://12factor.net/)
- [Cache-Aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
