# AI Integration — CGV Việt Nam

Tích hợp OpenAI GPT-4o-mini vào website đặt vé phim CGV. Hoàn thành ngày 2026-05-28.

## Cấu hình ban đầu

1. Cài dependencies backend:
   ```bash
   cd backend && npm install
   ```

2. Thêm OpenAI API key vào `backend/.env`:
   ```
   OPENAI_API_KEY=sk-...
   AI_ENABLED=true
   ```

3. Chạy backend và frontend như bình thường.

## Tính năng đã tích hợp

### 1. Chatbot hỗ trợ khách hàng
- Nút chat floating góc phải dưới màn hình (tất cả trang)
- Trả lời về phim, giờ chiếu, rạp, giá vé bằng tiếng Việt
- Tự động truy vấn DB qua function calling (không bịa thông tin)
- Responsive: full screen trên mobile, popup 340×500px trên PC
- **Files:** `frontend/src/components/ChatbotWidget.jsx`, `frontend/src/styles/chatbot.css`

### 2. Gợi ý phim cá nhân hóa
- Hiển thị section "✨ Dành Riêng Cho Bạn" ở trang chủ (chỉ khi đã đăng nhập là Customer)
- Dựa vào lịch sử mua vé → AI gợi ý 3 phim phù hợp kèm lý do
- Cache 1 giờ theo email để tiết kiệm API call
- **Files:** `frontend/src/pages/Home/components/PersonalRecommendations.jsx`

### 3. Tìm kiếm phim ngôn ngữ tự nhiên
- Search box AI ở trang Showtimes (bên dưới bộ lọc thể loại)
- Ví dụ: "phim hành động cuối tuần cho gia đình" → AI hiểu và trả về phim phù hợp
- Hiển thị "AI hiểu yêu cầu là..." để user biết AI đang làm gì
- **Files:** `frontend/src/pages/Showtimes/components/AISearchBox.jsx`

### 4. Công cụ AI cho Admin
- **Sinh mô tả phim tự động**: Nút "✨ AI sinh mô tả" trong form thêm phim (nhập tên phim trước)
- **Tab AI Assistant**: Phân tích doanh thu, top phim, phim bán chậm + insight từ AI
- **Files:** `frontend/src/pages/Admin/components/AdminAIPanel.jsx`

## Cấu trúc file mới

```
backend/
  ai/
    openaiClient.js   — khởi tạo OpenAI client
    prompts.js        — system prompts cho từng tính năng
    helpers.js        — hàm truy vấn DB (chỉ READ)
    cache.js          — in-memory cache với TTL
    routes.js         — tất cả API endpoints /ai/*

frontend/src/
  utils/aiClient.js              — axios wrapper gọi /ai/*
  reducers/aiSlice.js            — Redux state cho chat + recommendations
  styles/chatbot.css             — styles chatbot widget
  styles/ai.css                  — styles recommendations, search, admin AI
  components/ChatbotWidget.jsx   — chatbot floating button + window
  pages/Home/components/PersonalRecommendations.jsx
  pages/Showtimes/components/AISearchBox.jsx
  pages/Admin/components/AdminAIPanel.jsx
```

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/ai/chat` | Chatbot — nhận `{ messages }` |
| POST | `/ai/recommendations` | Gợi ý phim — nhận `{ email }` |
| POST | `/ai/search` | Tìm kiếm NL — nhận `{ query }` |
| POST | `/ai/admin/generateDescription` | Sinh mô tả phim — nhận `{ name, genres, ... }` |
| GET  | `/ai/admin/analytics` | Phân tích doanh thu |

Rate limit: 20 request/phút/IP. Cache: recommendations 1h, analytics 30 phút.

## Lưu ý bảo mật

- API key OpenAI chỉ ở `backend/.env`, không bao giờ expose ra frontend
- Tất cả AI helpers chỉ READ database, không có DELETE/UPDATE
- Rate limiting bảo vệ khỏi lạm dụng API key
