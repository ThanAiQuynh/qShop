src
 ┣ common
 ┃ ┣ constants
 ┃ ┣ exceptions
 ┃ ┣ filters
 ┃ ┣ interceptors
 ┃ ┗ utils
 ┃
 ┣ config
 ┃ ┣ configuration.ts
 ┃ ┗ env.validation.ts
 ┃
 ┣ database
 ┃ ┣ schema
 ┃ ┃ ┗ product.schema.ts
 ┃ ┣ migrations
 ┃ ┗ db.ts
 ┃
 ┣ product
 ┃ ┣ dto
 ┃ ┃ ┣ create-product.dto.ts
 ┃ ┃ ┗ update-product.dto.ts
 ┃ ┣ repositories
 ┃ ┃ ┗ product.repository.ts
 ┃ ┣ product.controller.ts
 ┃ ┣ product.service.ts
 ┃ ┗ product.module.ts
 ┃
 ┣ app.module.ts
 ┗ main.ts