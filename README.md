# 🎬 CGV VIỆT NAM - Ứng dụng Đặt Vé Xem Phim Trực Tuyến

Chào mừng bạn đến với **CGV Việt Nam**, nền tảng đặt vé xem phim trực tuyến tiện lợi và hiện đại. Kho lưu trữ này chứa toàn bộ mã nguồn của website CGV, được xây dựng bằng React, Express, MySQL và Node.js.

## 🎯 Tính Năng Nổi Bật

- 📽 **Duyệt & Lọc Danh Sách Phim**
- 🎞 **Xem Chi Tiết Phim**
- 🕑 **Tra Cứu Suất Chiếu**
- 🎟 **Đặt Vé Xem Phim**
- 🔐 **Đăng Ký & Đăng Nhập Người Dùng**
- 📒 **Lịch Sử Mua Vé Cá Nhân**
- 🛠️ **Quản Trị Phim & Lịch Chiếu (Admin Panel)**
- 📱 **Giao Diện Responsive, Tối Ưu Trên Mọi Thiết Bị**
---

## ⚙️ Công Nghệ Sử Dụng

| Phần | Công Nghệ |
|------|------------|
| **Client (Frontend)** | React, CSS, Vite |
| **Server (Backend/API)** | Node.js, Express |
| **Cơ sở dữ liệu** | MySQL |


## Cách sử dụng!
👉 Cài đặt thư viện: npm install

    Run Backend: nodemon index.js
    Run frontend: npm run dev

## Swagger API

Sau khi backend chạy, mở tài liệu API tại:

- Swagger UI: `http://localhost:7000/api-docs`
- OpenAPI JSON: `http://localhost:7000/api-docs.json`

## Cấu trúc backend

```text
backend/
├── controllers/   # Nhận request và trả response
├── middleware/    # Upload ảnh và bảo vệ endpoint cũ
├── routes/        # Khai báo URL, HTTP method và middleware
├── services/      # MySQL, PayOS, admin, logging và Cloudflare R2
├── app.js         # Tạo Express app và mount các route
├── index.js       # Khởi tạo service và chạy HTTP server
└── swagger.js     # OpenAPI specification
```
---
## 🇻🇳 Về CGV Việt Nam
> **CÔNG TY TNHH CJ CGV VIỆT NAM**  
> Tầng 2, Tòa nhà Rivera Park Saigon  
> Số 7/28 Thành Thái, Phường 14, Quận 10, TP. Hồ Chí Minh, Việt Nam

## ❤️ Cảm ơn bạn đã ghé thăm!

Nếu bạn muốn đóng góp, tạo issue, hay cải thiện hệ thống, hãy tạo pull request nhé. CGV luôn chào đón mọi nhà phát triển yêu phim ảnh! 🎞
