# Quy Tắc Chuẩn SEO & Semantic HTML (SEO Standards)

Quy tắc này bắt buộc áp dụng khi viết hoặc cập nhật các component giao diện, trang (pages) và thẻ metadata trên website Trọ Xinh.

---

## 1. Cấu Trúc Thẻ Semantic HTML & Heading
- **Thẻ Heading `<h1>`**: Mỗi trang chỉ được phép có **duy nhất một thẻ `<h1>`**. Thẻ này phải chứa từ khóa chính thể hiện nội dung của trang (Ví dụ: `<h1>Tìm phòng trọ, căn hộ mini tại Hà Nội</h1>`).
- **Thứ bậc Heading**: Các thẻ `<h2>`, `<h3>`, `<h4>` phải phân cấp tuần tự logic, tuyệt đối không nhảy cóc từ `<h2>` xuống thẳng `<h4>`.
- **Cấu trúc ngữ nghĩa**: Sử dụng thẻ Semantic HTML (`<main>`, `<header>`, `<nav>`, `<section>`, `<article>`, `<aside>`, `<footer>`) đúng vai trò, không bọc toàn bộ giao diện bằng các thẻ `<div>` vô nghĩa.

---

## 2. Tiêu Đề (Title) & Thẻ Mô Tả (Meta Description)
- Mọi trang phải có thẻ tiêu đề `<title>` độc nhất, không dùng tiêu đề chung chung hoặc để mặc định `React App`.
- Format tiêu đề: `[Tên Nội Dung Cụ Thể] | Trọ Xinh`. Độ dài từ 40 - 60 ký tự.
- Format mô tả `<meta name="description">`: Ngắn gọn từ 130 - 160 ký tự, nêu rõ giá trị cốt lõi và có lời kêu gọi hành động (Call To Action).

---

## 3. Thuộc Tính Ảnh & Trải Nghiệm Tải Trang (Core Web Vitals)
- **Thuộc tính `alt`**: Mọi thẻ `<img>` đều bắt buộc phải có thuộc tính `alt` mô tả trực quan và có ý nghĩa (Ví dụ: `alt="Phòng trọ 25m2 có ban công ngõ Cầu Giấy"` thay vì `alt="image"` hoặc `alt=""`).
- **Chống giật layout (Cumulative Layout Shift - CLS)**: Luôn khai báo tỉ lệ khung hình `aspect-ratio` hoặc kích thước `width`, `height` cho ảnh đại diện phòng trọ và sản phẩm chợ đồ cũ.
- **Lazy Loading**: Sử dụng `loading="lazy"` đối với tất cả các ảnh nằm bên dưới màn hình đầu tiên (below the fold) để tăng tốc độ tải trang ban đầu (LCP).

---

## 4. Thẻ Chia Sẻ Mạng Xã Hội (OpenGraph & Social Preview)
- Khi chia sẻ đường link trang phòng trọ hoặc sản phẩm lên Facebook, Zalo, Telegram:
  - Thẻ `og:title`: Trùng khớp hoặc tối ưu hấp dẫn hơn tiêu đề bài viết.
  - Thẻ `og:description`: Tóm tắt giá thuê, địa chỉ quận huyện và tình trạng phòng.
  - Thẻ `og:image`: Luôn trỏ về URL ảnh chất lượng cao đại diện cho phòng trọ hoặc sản phẩm.
  - Thẻ `og:type`: `website` hoặc `article`.

---

## 5. Phân Quyền & Bảo Vệ Trang Riêng Tư (Robots Meta)
- Các trang cá nhân, giao dịch riêng tư tuyệt đối **KHÔNG** được để Google lập chỉ mục:
  - Hộp thư chat (`/chat`)
  - Quản trị viên (`/admin`)
  - Hợp đồng đặt cọc (`/deposit/*`)
  - Quản lý tin chủ trọ (`/owner/*`)
- Luôn gắn thẻ `<meta name="robots" content="noindex, nofollow" />` cho các trang này.
