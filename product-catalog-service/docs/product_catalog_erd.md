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
  updated_at   timestamp   Ngày cập nhật gần nhất
  deleted_at   timestamp   Soft delete (NULL nếu active)

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
  deleted_at    timestamp   Soft delete

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
  updated_at      timestamp   
  deleted_at      timestamp   Soft delete

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
  created_at   timestamp
  updated_at   timestamp
  deleted_at   timestamp

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
  created_at     timestamp
  updated_at     timestamp
  deleted_at     timestamp

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

Danh mục dạng tree. Tối ưu cho query nhiều cấp bằng `path` (Materialized Path).

  Column      Type        Description
  ----------- ----------- -------------------------------------------
  id          PK
  name        string
  slug        string
  parent_id   FK          NULL nếu là root
  path        string      Ví dụ: "1/5/12/" — dùng LIKE '1/5/%' query
  depth       int         Cấp độ trong cây (root = 0)
  created_at  timestamp
  updated_at  timestamp
  deleted_at  timestamp

Ví dụ:

  id   name          parent_id   path      depth
  ---- ------------- ----------- --------- -------
  1    Electronics   NULL        1/        0
  5    Phone         1           1/5/      1
  12   Smartphone    5           1/5/12/   2

Query tất cả con của Electronics:

SELECT \* FROM categories WHERE path LIKE '1/%'

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

Ảnh sản phẩm. Hỗ trợ ảnh gắn với Product hoặc Variant cụ thể (mỗi màu có bộ ảnh riêng).

  Column       Type        Description
  ------------ ----------- ------------------------------------------
  id           PK
  product_id   FK          Bắt buộc
  variant_id   FK          NULL = ảnh chung, có giá trị = ảnh variant
  url          string
  alt_text     string      SEO / Accessibility
  position     int
  is_primary   boolean
  created_at   timestamp
  updated_at   timestamp
  deleted_at   timestamp

Ví dụ:

  id   product   variant   is_primary   Ý nghĩa
  ---- --------- --------- ------------ -------------------
  1    iPhone    NULL      true         Ảnh chính sản phẩm
  2    iPhone    Đen       false        Ảnh riêng màu Đen
  3    iPhone    Vàng      false        Ảnh riêng màu Vàng

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

# 13. price_history

Lịch sử biến động giá của từng Variant. Phục vụ analytics, chart giá, và audit.

  Column        Type        Description
  ------------- ----------- -----------------------------------
  id            PK
  variant_id    FK          Liên kết product_variants
  old_price     decimal     Giá cũ
  new_price     decimal     Giá mới
  changed_by    FK/string   User hoặc system thực hiện thay đổi
  changed_at    timestamp   Thời điểm thay đổi

Ví dụ:

  variant     old_price   new_price   changed_at
  ----------- ----------- ----------- ----------------
  IP15-128    22000000    20000000    2025-11-11 00:00

INDEX(price_history.variant_id)

------------------------------------------------------------------------

# 14. product_archives

Lưu trữ product đã xóa.

  Column
  ---------------------
  id
  original_product_id
  data_json
  deleted_at

Dùng cho audit và khôi phục dữ liệu lịch sử sau khi đã xóa vật lý (Hard Delete) khỏi bảng chính.

------------------------------------------------------------------------

# 15. Chiến lược Xóa Dữ liệu (Soft Delete & Archiving)

Hệ thống áp dụng mô hình Hybrid để đảm bảo an toàn dữ liệu và hiệu năng:

1.  **Soft Delete:** Cập nhật `deleted_at` ở các bảng chính. Dữ liệu bị ẩn khỏi API/Web nhưng vẫn tồn tại trong DB.
2.  **Grace Period:** Dữ liệu nằm ở trạng thái Soft Delete trong một khoảng thời gian (ví dụ 30 ngày). Trong thời gian này, việc Restore cực kỳ đơn giản (set `deleted_at = NULL`).
3.  **Hard Delete & Archive:** Sau 30 ngày, một Job tự động sẽ:
    -   Đóng gói toàn bộ thông tin sản phẩm (Variants, Attributes, Images,...) vào một bản ghi JSON.
    -   Lưu vào bảng `product_archives`.
    -   Xóa vĩnh viễn (Hard Delete) các bản ghi cũ ở bảng chính để giải phóng dung lượng và tối ưu Index.

------------------------------------------------------------------------

# 16. Index quan trọng

Tổ chức theo query pattern thực tế. Composite index phải đặt cột có **cardinality cao** hoặc **filter trước** lên đầu.

------------------------------------------------------------------------

## Products — Lookup & Filter

  -- Tra cứu sản phẩm active (query phổ biến nhất)
  INDEX(products.status, deleted_at)

  -- Tra cứu bằng slug (URL)
  UNIQUE INDEX(products.slug)

  -- Lọc theo thương hiệu
  INDEX(products.brand_id, status)

------------------------------------------------------------------------

## Categories — Tree Query

  -- Materialized path: lấy cây con bằng LIKE '1/%'
  INDEX(categories.path)

  -- Lấy danh mục theo cấp
  INDEX(categories.depth, parent_id)

  -- Mapping product ↔ category
  INDEX(product_categories.category_id)
  INDEX(product_categories.product_id)   -- ngược lại để JOIN từ product

------------------------------------------------------------------------

## Variants — SKU & Price Filter

  -- Lấy tất cả variant của product
  INDEX(product_variants.product_id, deleted_at)

  -- Tra cứu SKU (unique)
  UNIQUE INDEX(product_variants.sku)

  -- Lọc theo khoảng giá (price range filter)
  INDEX(product_variants.price)

------------------------------------------------------------------------

## Attributes — Filter by Attribute Value

  -- Lấy các giá trị của một attribute (vd: tất cả màu sắc)
  INDEX(attribute_values.attribute_id)

  -- Reverse lookup: attribute_value → variants
  INDEX(variant_attributes.attribute_value_id)

  -- Lấy tất cả attribute của một variant
  INDEX(variant_attributes.variant_id)

------------------------------------------------------------------------

## product_filter_index — Main Filter Table

  -- Filter tổng hợp: category + khoảng giá (query nặng nhất)
  INDEX(product_filter_index.category_id, min_price, max_price)

------------------------------------------------------------------------

## variant_flattened — Search & Filter nhanh

  -- Tìm theo màu
  INDEX(variant_flattened.color)
  -- Tìm theo bộ nhớ
  INDEX(variant_flattened.storage)
  -- Tìm theo kích cỡ
  INDEX(variant_flattened.size)
  -- Filter giá trực tiếp trên bảng flatten
  INDEX(variant_flattened.price)
  -- Composite tổng hợp nhất cho search trang listing
  INDEX(variant_flattened.product_id, color, price)

------------------------------------------------------------------------

## Images

  -- Lấy ảnh theo product + variant (có NULL handling)
  INDEX(product_images.product_id, variant_id, is_primary)

------------------------------------------------------------------------

## price_history — Analytics & Audit

  -- Lịch sử giá theo variant, sắp xếp theo thời gian
  INDEX(price_history.variant_id, changed_at)

------------------------------------------------------------------------

# 17. Query Flow

Category query (tất cả sản phẩm trong cây Electronics):

categories (path LIKE '1/%') → product_categories → products

Variant query:

products → product_variants → variant_attributes

Filter query:

variant_flattened

Image query theo variant:

product_images WHERE product_id = ? AND (variant_id = ? OR variant_id IS NULL)

------------------------------------------------------------------------

# 18. Production Architecture

Catalog DB (normalized) ↓ ETL / indexing job ↓ Search engine
(Elasticsearch / OpenSearch)

Search engine dùng cho:

-   full text search
-   faceted filtering
-   recommendation
