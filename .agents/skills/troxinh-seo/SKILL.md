---
name: troxinh-seo
description: Cẩm nang thực thi và checklist chuẩn SEO toàn diện tối ưu riêng cho nền tảng thuê phòng trọ, tìm ở ghép và chợ đồ cũ Trọ Xinh. Chắt lọc tinh hoa từ claude-seo gồm Schema JSON-LD, Local SEO Hà Nội, GEO/AI Search Optimization và Technical SEO cho React SPA.
---

# Trọ Xinh — Cẩm Nang & Checklist SEO Toàn Diện (troxinh-seo)

Tài liệu này được tinh chỉnh chuyên sâu từ bộ quy chuẩn `claude-seo` dành riêng cho hệ thống **Trọ Xinh (troxinh.vn)**. Áp dụng khi tạo mới, tối ưu trang, kiểm tra audit hoặc lập trình dữ liệu hiển thị trên Google và các công cụ tìm kiếm AI (ChatGPT, Perplexity, Google AI Overviews).

---

## 1. Schema JSON-LD (Dữ liệu có cấu trúc)

Mọi trang chi tiết phòng trọ, sản phẩm đồ cũ hoặc danh mục tìm kiếm đều phải nhúng thẻ `<script type="application/ld+json">` tương ứng.

### 1.1. Schema Chi Tiết Phòng Trọ (`Accommodation` / `Apartment`)
Dành cho trang chi tiết phòng `/phong/:id`:
```json
{
  "@context": "https://schema.org",
  "@type": "Apartment",
  "name": "Phòng trọ khép kín full đồ ban công thoáng mát",
  "description": "Phòng trọ cao cấp diện tích 28m2, có gác xép, điều hòa, nóng lạnh, gần ĐH Sư Phạm, Cầu Giấy, Hà Nội.",
  "image": [
    "https://troxinh.vn/images/room-1.jpg"
  ],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Số 15 ngõ 120 Trần Thái Tông",
    "addressLocality": "Cầu Giấy",
    "addressRegion": "Hà Nội",
    "addressCountry": "VN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 21.0333,
    "longitude": 105.7891
  },
  "numberOfRooms": 1,
  "floorSize": {
    "@type": "QuantitativeValue",
    "value": 28,
    "unitCode": "MTK"
  },
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "Điều hòa", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Nóng lạnh", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Máy giặt chung", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Không chung chủ", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Gác xép", "value": true }
  ],
  "offers": {
    "@type": "Offer",
    "price": "3500000",
    "priceCurrency": "VND",
    "availability": "https://schema.org/InStock",
    "validFrom": "2026-01-01",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "price": "3500000",
      "priceCurrency": "VND",
      "unitText": "MONTH"
    }
  }
}
```

### 1.2. Schema Chợ Đồ Cũ Sinh Viên (`Product`)
Dành cho trang chợ đồ cũ `/cho-do-cu/:id`:
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Bàn học sinh viên gỗ ép còn mới 95%",
  "image": ["https://troxinh.vn/images/ban-hoc.jpg"],
  "description": "Bàn học kèm giá sách chuyển trọ cần thanh lý gấp, kích thước 1m2 x 60cm.",
  "offers": {
    "@type": "Offer",
    "price": "250000",
    "priceCurrency": "VND",
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/UsedCondition"
  }
}
```

### 1.3. Schema Toàn Sàn & Định Vị Thương Hiệu (`RealEstateAgent` / `LocalBusiness`)
Dành cho trang chủ `/` và chân trang (Footer):
```json
{
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "Trọ Xinh - Nền tảng tìm phòng trọ, ở ghép & thanh lý đồ sinh viên",
  "url": "https://troxinh.vn",
  "logo": "https://troxinh.vn/logo.png",
  "description": "Nền tảng kết nối trực tiếp chủ trọ và người thuê phòng, sinh viên tìm người ở ghép, thanh lý đồ cũ minh bạch và uy tín tại Hà Nội.",
  "telephone": "0888110789",
  "priceRange": "1.500.000 VND - 10.000.000 VND",
  "areaServed": {
    "@type": "AdministrativeArea",
    "name": "Hà Nội, Việt Nam"
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://troxinh.vn/tim-kiem?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

---

## 2. Local SEO & Geo-Targeting (Chiến Lược Địa Phương Hà Nội)

Trọ Xinh tập trung trọng điểm vào thị trường phòng trọ sinh viên và người đi làm tại Hà Nội. Mọi trang danh mục và bài viết phải lồng ghép chính xác cấu trúc thực thể địa phương:

### 2.1. Cụm 12 Quận Trọng Điểm
- Cầu Giấy, Đống Đa, Thanh Xuân, Nam Từ Liêm, Bắc Từ Liêm, Hai Bà Trưng, Ba Đình, Hoàn Kiếm, Hoàng Mai, Hà Đông, Tây Hồ, Long Biên.
- Công thức tiêu đề SEO danh mục:
  - `Phòng trọ [Quận/Phường] giá rẻ, chính chủ, mới nhất 2026 | Trọ Xinh`
  - Ví dụ: `Phòng trọ Cầu Giấy giá từ 2 - 4 triệu, không chung chủ | Trọ Xinh`

### 2.2. Cụm Trường Đại Học (Intent tìm kiếm sinh viên cao nhất)
- Cụm Cầu Giấy - Xuân Thủy: ĐH Quốc gia Hà Nội (VNU), ĐH Sư Phạm Hà Nội, ĐH Ngoại ngữ, Học viện Báo chí & Tuyên truyền.
- Cụm Đống Đa - Chùa Láng: ĐH Ngoại Thương (FTU), ĐH Ngoại Giao (DAV), ĐH Luật Hà Nội, Học viện Ngân Hàng (BA), ĐH Công Đoàn.
- Cụm Bách - Kinh - Xây: ĐH Bách Khoa Hà Nội (HUST), ĐH Kinh tế Quốc dân (NEU), ĐH Xây dựng (NUCE).
- Cụm Thanh Xuân - Hà Đông: ĐH Hà Nội (HANU), ĐH Kiến Trúc Hà Nội (HAU), Học viện Bưu chính Viễn thông (PTIT).
- Công thức URL và Title:
  - URL: `/rooms?school=dai-hoc-quoc-gia-ha-noi`
  - Title: `Tìm phòng trọ gần Đại học Bách Khoa Hà Nội giá sinh viên | Trọ Xinh`

### 2.3. Cụm Tiện Ích Giao Thông & Tuyến Đi Lại
- Gần các trạm đường sắt đô thị (Metro Line 2A Cát Linh - Hà Đông, Metro Line 3 Nhổn - Ga Hà Nội).
- Gần các tuyến bus nhanh BRT hoặc trục đường lớn: Nguyễn Trãi, Phạm Văn Đồng, Cầu Giấy, Giải Phóng.

---

## 3. GEO & AI Search Optimization (Generative Engine Optimization)

Người dùng ngày nay tìm trọ qua ChatGPT, Perplexity, Google SGE / Gemini ngày càng nhiều. Để các công cụ AI dễ dàng đọc hiểu và trích dẫn Trọ Xinh làm nguồn khuyến nghị:

1. **Dữ liệu Dạng Fact & Số Liệu Chính Xác (Không Mập Mờ):**
   - Giá thuê rõ ràng (VD: `3.500.000 VNĐ/tháng`, không ghi `giá thương lượng` hoặc `liên hệ`).
   - Tiền điện, nước, dịch vụ công khai: `Điện: 3.500đ/kWh`, `Nước: 30.000đ/khối` hoặc `100.000đ/người`.
   - Diện tích thực tế: `25 m²`.
   - Tiền cọc: `1 tháng`.
2. **Cấu trúc `llms.txt` tại Thư Mục `public/`:**
   - Cung cấp file tóm tắt nội dung nền tảng dạng plain text markdown để các AI agent crawler quét trực tiếp thông tin dịch vụ, API phòng trọ, danh mục quận huyện.
3. **Đoạn Trả Lời Trực Tiếp (Direct Answer Paragraphs):**
   - Ở đầu mỗi trang danh mục hoặc bài viết hướng dẫn, luôn có một đoạn tóm tắt 40-60 từ trả lời trực diện câu hỏi cốt lõi (VD: *"Giá thuê phòng trọ trung bình tại Cầu Giấy dao động từ 2.500.000đ đến 5.000.000đ tùy diện tích và trang thiết bị..."*).

---

## 4. Technical SEO Checklist cho React SPA (Vite)

### 4.1. Quản lý Thẻ Dynamic Meta & Head
Vì Trọ Xinh là SPA (Single Page Application), cần đảm bảo mỗi màn hình cập nhật:
- Thẻ `<title>`: Ngắn gọn (< 60 ký tự), chứa từ khóa trọng tâm + thương hiệu.
- Thẻ `<meta name="description">`: Từ 140 - 160 ký tự, có kêu gọi hành động (Call To Action).
- Thẻ `<link rel="canonical" href="...">`: Luôn trỏ về URL gốc, loại bỏ các query param phân trang hoặc bộ lọc không cần thiết để tránh trùng lặp nội dung (duplicate content).
- Thẻ OpenGraph đầy đủ:
  - `og:site_name`: Trọ Xinh
  - `og:title`, `og:description`, `og:image` (ảnh thực tế phòng trọ tỉ lệ 1200x630px).

### 4.2. Thẻ Robots & Sitemap
- `public/robots.txt`:
  ```text
  User-agent: *
  Allow: /
  Disallow: /admin/
  Disallow: /chat
  Disallow: /deposit/
  Disallow: /owner/
  
  Sitemap: https://troxinh.vn/sitemap.xml
  ```
- Các trang riêng tư của người dùng (Hộp thư `/chat`, Hợp đồng cọc `/deposit/:id`, Dashboard `/admin`) phải luôn có thẻ meta:
  `<meta name="robots" content="noindex, nofollow" />`.

### 4.3. Core Web Vitals & Trải Nghiệm Trang
- **LCP (Largest Contentful Paint < 2.5s):** Tối ưu ảnh banner và ảnh bìa phòng trọ, chuyển định dạng WebP, nén ảnh trước khi lưu storage.
- **CLS (Cumulative Layout Shift < 0.1):** Luôn khai báo `aspect-ratio` hoặc `width` và `height` cho các khung ảnh phòng trọ để tránh xô lệch giao diện khi ảnh load xong.
- **INP (Interaction to Next Paint < 200ms):** Sử dụng TanStack Query cache dữ liệu phòng trọ, không re-render không cần thiết.

---

## 5. Quy Trình Kiểm Tra (Audit Checklist) Khi Xuất Bản Tính Năng

Trước khi bàn giao bất kỳ trang hoặc chức năng mới nào ra môi trường production:
- [ ] Trang có duy nhất 1 thẻ `<h1>` chứa từ khóa trọng tâm?
- [ ] Thẻ `<title>` và `<meta description>` có tồn tại và đúng ngữ cảnh không?
- [ ] Tất cả các thẻ `<img>` đều có thuộc tính `alt` mô tả nghĩa rõ ràng?
- [ ] Dữ liệu có cấu trúc Schema JSON-LD đã được kiểm tra tính hợp lệ (không lỗi cú pháp)?
- [ ] Link chia sẻ hiển thị đúng ảnh thumbnail và mô tả trên Facebook/Zalo?
- [ ] Các trang nhạy cảm hoặc cá nhân hóa đã được chặn index bot an toàn?
