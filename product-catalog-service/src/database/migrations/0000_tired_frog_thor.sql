CREATE TYPE "public"."product_status" AS ENUM('active', 'draft');--> statement-breakpoint
CREATE TYPE "public"."attribute_type" AS ENUM('text', 'number', 'color', 'boolean');--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"logo" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product_archives" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_product_id" integer NOT NULL,
	"data_json" text NOT NULL,
	"deleted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"variant_id" integer,
	"url" varchar(1024) NOT NULL,
	"alt_text" varchar(255),
	"position" integer DEFAULT 0 NOT NULL,
	"is_primary" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"brand_id" integer,
	"description" text,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"parent_id" integer,
	"path" varchar(1024) DEFAULT '' NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "product_categories_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "attribute_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"attribute_id" serial NOT NULL,
	"value" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "attributes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"type" "attribute_type" DEFAULT 'text' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"sku" varchar(100) NOT NULL,
	"price" numeric(15, 2) NOT NULL,
	"compare_price" numeric(15, 2),
	"weight" numeric(10, 3),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "variant_attributes" (
	"variant_id" integer NOT NULL,
	"attribute_value_id" integer NOT NULL,
	CONSTRAINT "variant_attributes_variant_id_attribute_value_id_pk" PRIMARY KEY("variant_id","attribute_value_id")
);
--> statement-breakpoint
CREATE TABLE "variant_flattened" (
	"variant_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"color" varchar(100),
	"size" varchar(100),
	"storage" varchar(100),
	"price" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_facets" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"facet_key" varchar(100) NOT NULL,
	"facet_value" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_filter_index" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"min_price" numeric(15, 2),
	"max_price" numeric(15, 2),
	"colors" varchar(512),
	"sizes" varchar(512),
	"storages" varchar(512),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" integer NOT NULL,
	"old_price" numeric(15, 2) NOT NULL,
	"new_price" numeric(15, 2) NOT NULL,
	"changed_by" varchar(255),
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_attribute_id_attributes_id_fk" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_attributes" ADD CONSTRAINT "variant_attributes_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_attributes" ADD CONSTRAINT "variant_attributes_attribute_value_id_attribute_values_id_fk" FOREIGN KEY ("attribute_value_id") REFERENCES "public"."attribute_values"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_flattened" ADD CONSTRAINT "variant_flattened_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_flattened" ADD CONSTRAINT "variant_flattened_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_facets" ADD CONSTRAINT "product_facets_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_filter_index" ADD CONSTRAINT "product_filter_index_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_filter_index" ADD CONSTRAINT "product_filter_index_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brands_slug_idx" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "brands_deleted_at_idx" ON "brands" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "product_images_product_variant_primary_idx" ON "product_images" USING btree ("product_id","variant_id","is_primary");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_status_deleted_at_idx" ON "products" USING btree ("status","deleted_at");--> statement-breakpoint
CREATE INDEX "products_brand_id_status_idx" ON "products" USING btree ("brand_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_path_idx" ON "categories" USING btree ("path");--> statement-breakpoint
CREATE INDEX "categories_depth_parent_idx" ON "categories" USING btree ("depth","parent_id");--> statement-breakpoint
CREATE INDEX "categories_deleted_at_idx" ON "categories" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "product_categories_category_id_idx" ON "product_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_categories_product_id_idx" ON "product_categories" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "attribute_values_attribute_id_idx" ON "attribute_values" USING btree ("attribute_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attributes_code_idx" ON "attributes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "attributes_deleted_at_idx" ON "attributes" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_sku_idx" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_deleted_at_idx" ON "product_variants" USING btree ("product_id","deleted_at");--> statement-breakpoint
CREATE INDEX "product_variants_price_idx" ON "product_variants" USING btree ("price");--> statement-breakpoint
CREATE INDEX "variant_attributes_variant_id_idx" ON "variant_attributes" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "variant_attributes_attribute_value_id_idx" ON "variant_attributes" USING btree ("attribute_value_id");--> statement-breakpoint
CREATE INDEX "variant_flattened_product_color_price_idx" ON "variant_flattened" USING btree ("product_id","color","price");--> statement-breakpoint
CREATE INDEX "variant_flattened_color_idx" ON "variant_flattened" USING btree ("color");--> statement-breakpoint
CREATE INDEX "variant_flattened_storage_idx" ON "variant_flattened" USING btree ("storage");--> statement-breakpoint
CREATE INDEX "variant_flattened_size_idx" ON "variant_flattened" USING btree ("size");--> statement-breakpoint
CREATE INDEX "variant_flattened_price_idx" ON "variant_flattened" USING btree ("price");--> statement-breakpoint
CREATE INDEX "product_facets_product_id_key_idx" ON "product_facets" USING btree ("product_id","facet_key");--> statement-breakpoint
CREATE INDEX "product_facets_key_value_idx" ON "product_facets" USING btree ("facet_key","facet_value");--> statement-breakpoint
CREATE INDEX "product_filter_index_category_price_idx" ON "product_filter_index" USING btree ("category_id","min_price","max_price");--> statement-breakpoint
CREATE INDEX "product_filter_index_product_id_idx" ON "product_filter_index" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "price_history_variant_id_changed_at_idx" ON "price_history" USING btree ("variant_id","changed_at");