# Hướng dẫn Setup Dự án NestJS — product-catalog-service

Tài liệu này hướng dẫn setup dự án **product-catalog-service** từ con số 0, dựa trên:
- [ERD Database](./product_catalog_erd.md)
- [Cấu trúc dự án](./structure.md)
- [Kế hoạch Performance & Reliability](./PERFORMANCE_RELIABILITY_PLAN.md)

---

## Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Tạo dự án NestJS](#2-tạo-dự-án-nestjs)
3. [Cài đặt dependencies](#3-cài-đặt-dependencies)
4. [Cấu trúc thư mục](#4-cấu-trúc-thư-mục)
5. [Cấu hình môi trường](#5-cấu-hình-môi-trường)
6. [Database (PostgreSQL + Drizzle)](#6-database-postgresql--drizzle)
7. [Schema và migrations](#7-schema-và-migrations)
8. [Redis Cache](#8-redis-cache)
9. [Health checks](#9-health-checks)
10. [Docker](#10-docker)
11. [Chạy dự án](#11-chạy-dự-án)

---

## 1. Yêu cầu hệ thống

| Công nghệ | Phiên bản tối thiểu |
|-----------|----------------------|
| Node.js   | 20.x LTS             |
| pnpm      | 8.x hoặc npm 9+      |
| PostgreSQL| 15+                  |
| Redis     | 6+                   |
| Docker    | 24+ (tùy chọn)       |

### Cài đặt pnpm (nếu chưa có)

```bash
npm install -g pnpm
```

---

## 2. Tạo dự án NestJS

### 2.1 Tạo project mới

```bash
# Dùng NestJS CLI
npx @nestjs/cli new product-catalog-service --package-manager pnpm --skip-git
cd product-catalog-service
```

**Lựa chọn khi CLI hỏi:**
- Package manager: **pnpm**
- Strict mode: **Yes**
- (Optional) Skip git: **Yes** nếu đã có repo

### 2.2 Cấu trúc cơ bản

Sau khi tạo, dự án có cấu trúc:

```
product-catalog-service/
├── src/
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts
├── test/
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## 3. Cài đặt Dependencies

### 3.1 Dependencies chính

```bash
# Config & Validation
pnpm add @nestjs/config joi

# Database
pnpm add drizzle-orm pg

# Validation pipes
pnpm add class-validator class-transformer

# Cache (Redis) — theo PERFORMANCE_RELIABILITY_PLAN
pnpm add @nestjs/cache-manager cache-manager cache-manager-redis-store

# Health checks
pnpm add @nestjs/terminus

# Rate limiting
pnpm add @nestjs/throttler
```

### 3.2 Dev dependencies

```bash
pnpm add -D drizzle-kit @types/pg @types/joi
```

### 3.3 Package.json — Scripts bổ sung

Thêm vào `package.json`:

```json
{
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "start:prod:memory": "node --max-old-space-size=2048 dist/main",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

> **Lưu ý:** `start:prod:memory` áp dụng `--max-old-space-size=2048` cho cấu hình 8GB RAM (theo PERFORMANCE_RELIABILITY_PLAN).

---

## 4. Cấu trúc thư mục

Tạo đầy đủ cấu trúc theo [structure.md](./structure.md):

```
src/
├── common/                  # Shared utilities
│   ├── constants/
│   ├── exceptions/
│   ├── filters/
│   ├── interceptors/
│   └── utils/
│
├── config/                  # Configuration
│   ├── configuration.ts
│   └── env.validation.ts
│
├── database/                # Database layer
│   ├── schema/              # Drizzle schemas
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
│   │   ├── product-archives.schema.ts
│   │   └── index.ts
│   ├── migrations/
│   └── db.ts
│
├── product/                 # Product module
│   ├── dto/
│   │   ├── create-product.dto.ts
│   │   └── update-product.dto.ts
│   ├── repositories/
│   │   └── product.repository.ts
│   ├── product.controller.ts
│   ├── product.service.ts
│   └── product.module.ts
│
├── app.module.ts
└── main.ts
```

```bash
# Tạo thư mụcNew-Item -ItemType Directory -Force -Path `
src/common/constants,
src/common/exceptions,
src/common/filters,
src/common/interceptors,
src/common/utils,
src/config,
src/database/schema,
src/database/migrations,
src/product/dto,
src/product/repositories
```

---

## 5. Cấu hình môi trường

### 5.1 `src/config/configuration.ts`

```typescript
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  logLevel: process.env.LOG_LEVEL ?? 'info',
});
```

### 5.2 `src/config/env.validation.ts`

```typescript
import Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().uri().default('redis://localhost:6379'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
});
```

### 5.3 `.env.example`

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/product_catalog
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

### 5.4 Copy và chỉnh sửa

```bash
cp .env.example .env
# Chỉnh sửa .env với thông tin thực tế
```

---

## 6. Database (PostgreSQL + Drizzle)

### 6.1 Cài PostgreSQL

**Windows / WSL:**
- Tải [PostgreSQL](https://www.postgresql.org/download/) hoặc dùng Docker
- Tạo database: `createdb product_catalog`

**Docker:**
```bash
docker run -d --name postgres-catalog \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=product_catalog \
  -p 5432:5432 \
  postgres:15-alpine
```

### 6.2 `src/database/db.ts`

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool);
```

> **Pool size 10–15** phù hợp cho 8GB RAM (theo PERFORMANCE_RELIABILITY_PLAN).

### 6.3 `drizzle.config.ts` (root)

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

## 7. Schema và Migrations

Tham khảo [product_catalog_erd.md](./product_catalog_erd.md) để tạo các schema tương ứng.

### 7.1 Các bảng chính

| Bảng                | Mô tả                      |
|---------------------|----------------------------|
| `brands`            | Thương hiệu                |
| `products`          | Sản phẩm gốc               |
| `product_variants`  | SKU / variant              |
| `attributes`        | Loại attribute (color, size)|
| `attribute_values`  | Giá trị attribute          |
| `variant_attributes`| Mapping variant → values   |
| `categories`        | Category tree              |
| `product_categories`| N-N product ↔ category     |
| `product_images`    | Ảnh sản phẩm              |
| `product_facets`    | Faceted search             |
| `product_filter_index`| Materialized filter      |
| `variant_flattened` | Flatten cho search         |
| `product_archives`   | Audit sản phẩm đã xóa      |

### 7.2 Index quan trọng (theo ERD)

- `products.slug`, `products.brand_id`
- `product_categories.category_id`
- `product_variants.product_id`
- `product_facets.facet_key`, `facet_value`
- `variant_flattened.color`, `variant_flattened.storage`
- **GIN index** cho full-text search (`tsvector`)

### 7.3 Generate và chạy migrations

```bash
# Generate migration từ schema
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Hoặc push trực tiếp (dev)
pnpm db:push
```

---

## 8. Redis Cache

Theo [PERFORMANCE_RELIABILITY_PLAN.md](./PERFORMANCE_RELIABILITY_PLAN.md) — Cache-Aside.

### 8.1 Cài Redis

**Docker:**
```bash
docker run -d --name redis-catalog \
  -p 6379:6379 \
  redis:7-alpine
```

**Windows:** [Redis for Windows](https://github.com/microsoftarchive/redis/releases) hoặc WSL2.

### 8.2 Cấu hình Cache trong NestJS

`src/app.module.ts`:

```typescript
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    ConfigModule.forRoot({ /* ... */ }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: redisStore,
        url: config.get('redisUrl'),
        ttl: 3600, // 1 giờ (seconds)
      }),
    }),
    // ...
  ],
})
export class AppModule {}
```

### 8.3 Cache-Aside pattern

- **Đọc:** Cache hit → return; miss → DB → populate cache → return
- **Ghi:** Update DB → **invalidate** cache key
- **TTL:** Luôn đặt TTL (ví dụ 1h) cho mọi key

---

## 9. Health checks

Cài `@nestjs/terminus` và tạo Health Module.

### 9.1 Endpoints

| Endpoint         | Mục đích                    |
|------------------|-----------------------------|
| `/health/live`   | Liveness — service còn sống |
| `/health/ready`  | Readiness — DB, Redis sẵn sàng |

### 9.2 Ví dụ Health Controller

```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, PrismaHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      // () => this.db.pingCheck('database'),
      // () => this.redis.pingCheck('redis'),
    ]);
  }
}
```

---

## 10. Docker

### 10.1 Dockerfile (Alpine, multi-stage)

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --prod --frozen-lockfile
ENV NODE_ENV=production
CMD ["node", "dist/main"]
```

### 10.2 `.dockerignore`

```
node_modules
dist
.git
.env
*.md
test
```

### 10.3 docker-compose.yml (dev)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: product_catalog
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/product_catalog
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

---

## 11. Chạy dự án

### 11.1 Development

```bash
# 1. Copy env
cp .env.example .env

# 2. Khởi động Postgres + Redis (Docker)
docker compose up -d postgres redis

# 3. Migrate DB
pnpm db:push

# 4. Chạy dev server
pnpm start:dev
```

### 11.2 Production

```bash
pnpm build
NODE_OPTIONS=--max-old-space-size=2048 pnpm start:prod
```

### 11.3 Kiểm tra

- API: `http://localhost:3000/api`
- Health: `http://localhost:3000/api/v1/health/live`
- Swagger (nếu có): `http://localhost:3000/api/v1/docs`

---

## Roadmap thực hiện (theo PERFORMANCE_RELIABILITY_PLAN)

| Tuần  | Nội dung                                                       |
|-------|-----------------------------------------------------------------|
| 1     | Foundation — Health, Config, Graceful shutdown                  |
| 2     | Trụ cột 1 — Redis Cache-Aside, PostgreSQL + Indexing            |
| 3     | Trụ cột 2 — Connection pool, Throttler, Resource limits         |
| 4     | Trụ cột 3 — Stateless, Docker Alpine                           |
| 5+    | Reliability — Retry, Circuit breaker, Logging                   |
| 6     | Verification — Load Test (k6/autocannon), Benchmarking         |

---

## Tài liệu tham khảo

- [NestJS Documentation](https://docs.nestjs.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [NestJS Caching](https://docs.nestjs.com/techniques/caching)
- [PostgreSQL Indexing](https://www.postgresql.org/docs/current/indexes.html)
- [The Twelve-Factor App](https://12factor.net/)
