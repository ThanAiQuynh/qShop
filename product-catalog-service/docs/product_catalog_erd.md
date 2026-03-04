# Product Catalog Database Design (Production-Level ERD)

Thiết kế này mô phỏng kiến trúc catalog của các hệ thống e-commerce lớn
(Amazon, Shopify, Shopee). Mục tiêu:

-   Scale hàng triệu sản phẩm
-   Hỗ trợ variant (SKU)
-   Filter nhanh (faceted search)
-   Category tree
-   Search tối ưu

------------------------------------------------------------------------

# 1. brands

Danh sách thương hiệu.

  Column       Type        Description
  ------------ ----------- -----------------
  id           PK          Brand ID
  name         string      Tên thương hiệu
  slug         string      URL slug
  logo         string      Logo
  created_at   timestamp   Ngày tạo

Ví dụ:

  id   name
  ---- -------
  1    Apple
  2    Nike

------------------------------------------------------------------------

# 2. products

Bảng sản phẩm gốc.

  Column        Type        Description
  ------------- ----------- ----------------
  id            PK          Product ID
  name          string      Tên sản phẩm
  slug          string      URL
  brand_id      FK          Liên kết brand
  description   text        Mô tả
  status        enum        active / draft
  created_at    timestamp   
  updated_at    timestamp   

Lưu ý: không lưu color, size, storage trong bảng này.

------------------------------------------------------------------------

# 3. product_variants

Mỗi variant là một SKU.

  Column          Type        Description
  --------------- ----------- ---------------
  id              PK          Variant ID
  product_id      FK          Thuộc product
  sku             string      SKU
  price           decimal     Giá
  compare_price   decimal     Giá gốc
  weight          decimal     Trọng lượng
  created_at      timestamp   

Ví dụ:

  variant   product     sku
  --------- ----------- --------------
  1         iPhone 15   IP15-128-BLK
  2         iPhone 15   IP15-256-BLK

------------------------------------------------------------------------

------------------------------------------------------------------------

# 4. attributes

Danh sách loại attribute.

  Column   Type
  -------- --------
  id       PK
  name     string
  code     string
  type     enum

Ví dụ:

  id   code
  ---- ---------
  1    color
  2    size
  3    storage

------------------------------------------------------------------------

# 5. attribute_values

Danh sách giá trị attribute.

  Column         Type
  -------------- --------
  id             PK
  attribute_id   FK
  value          string

Ví dụ:

  id   attribute   value
  ---- ----------- -------
  1    color       black
  2    color       white
  3    storage     128GB

------------------------------------------------------------------------

# 6. variant_attributes

Mapping variant → attribute values.

  Column
  --------------------
  variant_id
  attribute_value_id

Ví dụ:

  variant   value
  --------- -------
  1         black
  1         128GB
  2         black
  2         256GB

------------------------------------------------------------------------

# 7. categories

Danh mục dạng tree.

  Column      Type
  ----------- --------
  id          PK
  name        string
  slug        string
  parent_id   FK

Ví dụ:

Electronics └── Phone └── Smartphone

------------------------------------------------------------------------

# 8. product_categories

Mapping many-to-many.

  Column
  -------------
  product_id
  category_id

Một product có thể thuộc nhiều category.

------------------------------------------------------------------------

# 9. product_images

Ảnh sản phẩm.

  Column       Type
  ------------ ---------
  id           PK
  product_id   FK
  url          string
  position     int
  is_primary   boolean

------------------------------------------------------------------------

# 10. product_facets

Dùng cho faceted search.

  Column
  -------------
  product_id
  facet_key
  facet_value

Ví dụ:

  product   key       value
  --------- --------- -------
  1         color     black
  1         storage   128

------------------------------------------------------------------------

# 11. product_filter_index

Materialized filter table.

  Column
  -------------
  product_id
  category_id
  min_price
  max_price
  colors
  sizes
  storages

Dùng để query filter cực nhanh.

Ví dụ:

WHERE category = phone\
AND color = black\
AND price \< 30000000

------------------------------------------------------------------------

# 12. variant_flattened

Bảng flatten cho search.

  Column
  ------------
  variant_id
  product_id
  color
  size
  storage
  price

Query:

SELECT \* FROM variant_flattened WHERE color='black' AND storage='256'

------------------------------------------------------------------------

# 13. product_archives

Lưu trữ product đã xóa.

  Column
  ---------------------
  id
  original_product_id
  data_json
  deleted_at

Dùng cho audit và restore.

------------------------------------------------------------------------

# 14. Index quan trọng

Products:

INDEX(products.slug)\
INDEX(products.brand_id)

Category:

INDEX(product_categories.category_id)

Variants:

INDEX(product_variants.product_id)

Facets:

INDEX(product_facets.facet_key, facet_value)

Search:

INDEX(variant_flattened.color)\
INDEX(variant_flattened.storage)

------------------------------------------------------------------------

# 15. Query Flow

Category query:

category → product_categories → products

Variant query:

products → product_variants → variant_attributes

Filter query:

variant_flattened

------------------------------------------------------------------------

# 16. Production Architecture

Catalog DB (normalized) ↓ ETL / indexing job ↓ Search engine
(Elasticsearch / OpenSearch)

Search engine dùng cho:

-   full text search
-   faceted filtering
-   recommendation
