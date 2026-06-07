# BÁO CÁO AUDIT TOÀN DIỆN HỆ THỐNG BOOKING CGV

**Ngày:** 07/06/2026  
**Tác giả:** AI Audit Agent  
**Mục đích:** Phân tích toàn bộ hệ thống (React/Vite + Express/MySQL + PayOS)

---

## MỤC LỤC

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc project](#2-kiến-trúc-project)
3. [Luồng người dùng](#3-luồng-người-dùng)
4. [Luồng admin](#4-luồng-admin)
5. [Luồng thanh toán](#5-luồng-thanh-toán)
6. [Database schema](#6-database-schema)
7. [Các lỗi phát hiện](#7-các-lỗi-phát-hiện)
8. [Rủi ro bảo mật](#8-rủi-ro-bảo-mật)
9. [Đề xuất cải thiện](#9-đề-xuất-cải-thiện)
10. [Checklist các việc cần sửa](#10-checklist-các-việc-cần-sửa)

---

## 1. Tổng quan hệ thống

### 1.1. Giới thiệu
Hệ thống đặt vé xem phim trực tuyến cho CGV Việt Nam. Cho phép người dùng xem lịch chiếu, chọn ghế, đặt vé và thanh toán qua PayOS hoặc tại rạp.

### 1.2. Stack công nghệ

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend | React 18 + Vite + Redux Toolkit + React Router v6 |
| Styling | Vanilla CSS (styles.css, admin.css, ai.css, queries.css, chatbot.css) |
| Animation | Framer Motion, GSAP |
| Backend | Node.js + Express.js |
| Database | MySQL (qua mysql2 driver) |
| Payment | PayOS (cổng thanh toán Việt Nam) |
| AI | OpenAI GPT-4o-mini (chatbot, gợi ý phim, tìm kiếm, phân tích) |
| Hosting | Vercel (frontend), VPS (backend) |

### 1.3. Port và URL
- **Frontend dev:** `http://localhost:5173`
- **Backend:** `http://localhost:7000`
- **Database:** `36.50.27.243:3306` (remote MySQL)

### 1.4. Cấu trúc thư mục
```
booking_cgv/
├── backend/                    # Express API server
│   ├── index.js               # 2503 dòng - tất cả API endpoints
│   ├── migrate.js             # DB auto-migration script
│   ├── .env                   # DB, PayOS, OpenAI config
│   └── ai/
│       ├── routes.js          # AI endpoints (/ai/*)
│       ├── openaiClient.js    # OpenAI client
│       ├── prompts.js         # System prompts
│       ├── helpers.js         # Read-only DB helpers
│       └── cache.js           # In-memory TTL cache
├── frontend/                   # React/Vite SPA
│   ├── src/
│   │   ├── App.jsx            # Root + Routing
│   │   ├── main.jsx           # Entry point
│   │   ├── reduxStore.js      # Redux config
│   │   ├── reducers/          # 5 slices (auth, cart, location, ai, mobileNav)
│   │   ├── components/        # 11 shared components
│   │   ├── modals/            # Login + Signup modals
│   │   ├── pages/             # 7 page modules
│   │   ├── toasts/            # react-toastify config
│   │   └── utils/             # API URL, AI client, date utils
│   └── .env                   # VITE_API_URL
└── database/
    └── movie_ticket_booking_website.sql  # Schema + seed data
```

---

## 2. Kiến trúc project

### 2.1. Sơ đồ kiến trúc tổng thể

```
[Browser] → [Vercel (Frontend SPA)] → [Express API (VPS:7000)] → [MySQL DB (VPS:3306)]
                                              ↕
                                         [PayOS Gateway]
                                              ↕
                                         [OpenAI API]
```

### 2.2. Frontend Routing (`App.jsx`)

| Route | Page Component | Auth Required | Role Required |
|-------|---------------|---------------|---------------|
| `/` | `HomePage` | Không | - |
| `/showtimes` | `ShowtimesPage` | Không | - |
| `/movieDetails/:id` | `MovieDetailsPage` | Không | - |
| `/purchase` | `PurchasePage` | **Có** | Customer |
| `/customer` | `CustomerInfoPage` | **Có** | Customer |
| `/admin` | `AdminPage` | **Có** | Admin |
| `/aboutus` | `AboutUsPage` | Không | - |
| `/movieDetails` | → Redirect `/movieDetails/1` | - | - |

### 2.3. Redux Store

| Slice | State | Key Actions |
|-------|-------|-------------|
| `authentication` | `isAuthenticated`, `signedPerson`, `signModalState`, `loginModalState` | `login`, `logout`, `showLoginModal`, `showSignModal` |
| `cart` | `showtime_date`, `movie_id`, `hall_id`, `showtime_id`, `seat_id_list`, `seat_price`, `payment_method` | `resetCart`, `setShowDate`, `setMovie`, `setShowDetail`, `setSeat`, `setPaymentMethod` |
| `currentLocation` | `id`, `location`, `name` | `selectLocation` |
| `mobileNav` | `menuState` | `toggleMenuState` |
| `ai` | `chatOpen`, `messages`, `recommendations`, `recsLoading` | `toggleChat`, `addMessage`, `setRecommendations` |

### 2.4. Backend API Endpoints (tổng số ~45+)

| Nhóm | Số endpoint | File |
|------|-------------|------|
| Home/Discovery | 4 | `index.js` |
| Showtimes | 7 | `index.js` |
| Movie Details | 3 | `index.js` |
| Purchase/Payment | 8 | `index.js` (PayOS + legacy) |
| Auth | 3 | `index.js` |
| Customer | 3 | `index.js` |
| Admin | ~20+ | `index.js` |
| AI | 5 | `ai/routes.js` |

---

## 3. Luồng người dùng

### 3.1. Đăng ký tài khoản

```
User clicks "Đăng ký" → dispatch(showSignModal()) → SignupModal hiển thị
→ User nhập: firstName, lastName, phoneNumber, email, password
→ axios.post(/registration, {...})
→ Backend: INSERT INTO person (email, first_name, last_name, password, phone_number, person_type)
→ Trả về success message
→ Đóng modal
```

**⚠️ Vấn đề:**
- **Password lưu plaintext** - không hash
- Không check email đã tồn tại → nếu email duplicate, MySQL báo lỗi constraint → server trả về 500 "Sorry, Please try again!" (message không rõ ràng)

### 3.2. Đăng nhập / Đăng xuất

```
User clicks "Đăng nhập" → dispatch(showLoginModal()) → LoginModal hiển thị
→ User nhập email + password
→ axios.post(/login, {email, password})
→ Backend: SELECT email, first_name, person_type, password FROM person WHERE email=? AND password=?
→ Nếu tìm thấy → dispatch(login(userData)) → lưu vào localStorage
→ Nếu Admin → navigate("/admin")
→ Nếu không tìm thấy → 404 "tài khoản không tồn tại"

Đăng xuất: dispatch(logout()) → xóa localStorage
```

**⚠️ Vấn đề:**
- **Plaintext password** được lưu trong Redux state và localStorage (`signedPerson.password`)
- **Không có JWT/session** - toàn bộ authentication dựa trên localStorage
- **Password được gửi trong mọi request admin** (email + password trong body)
- Không có "remember me"
- `LoginModal.jsx` không phân biệt lỗi 404 (sai pass) với lỗi network - dùng chung message

### 3.3. Quên mật khẩu

**❌ KHÔNG TỒN TẠI.** Không có chức năng quên mật khẩu. Đây là missing feature.

### 3.4. Xem danh sách phim (Showtimes page)

```
User vào /showtimes
→ LocationSelector tự động tải danh sách rạp GET /theatres
→ Nếu chưa chọn rạp, auto-select rạp đầu tiên
→ ShowTimesCollection gọi POST /showtimes {theatreName, userGenre: "All"}
→ Backend JOIN 5 bảng, lấy 4 ngày chiếu gần nhất, trả về JSON
→ ShowtimesCard hiển thị phim + giờ chiếu theo ngày
```

### 3.5. Xem chi tiết phim

```
User vào /movieDetails/:id
→ MovieInfoSection gọi POST /movieDetail {movieDetailsId}
→ Backend JOIN movie + movie_directors + movie_genre
→ Hiển thị thông tin phim + lịch chiếu theo rạp đã chọn
→ User chọn giờ chiếu → dispatch(resetCart()) + navigate("/purchase")
```

### 3.6. Mua vé (Purchase flow)

Đây là flow phức tạp nhất:

```
ProtectedRoute đảm bảo isAuthenticated && person_type === "Customer"

Bước 1: LocationSelector (chọn rạp)
Bước 2: DateSelector → POST /showtimesDates {theatreId} → chọn ngày
Bước 3: MovieSelector → POST /uniqueMovies {theatreId, userDate} → chọn phim
Bước 4: PictureQualitySelector → POST /halls {theatreId, userDate, userMovieId}
         → chọn suất chiếu (phòng + giờ)
Bước 5: SeatSelector → POST /seats {userShowtimeId, userHallId, userMovieId}
         → hiển thị sơ đồ ghế, chọn ghế
Bước 6: PayMethodSelector → chọn PayOS hoặc "Thanh toán tại rạp"
Bước 7: Click "Mua vé" / "Tạo vé tại rạp"
```

**Flow thanh toán PayOS:**
```
handleTicketPurchase()
→ Nếu PayOS: POST /payos/create-payment-link {email, seatIds, userHallId, userMovieId, userShowtimeId}
  → Backend: buildPaymentOrderPayload() - kiểm tra ghế trống, tính tiền
  → Backend: INSERT payos_orders (status='PENDING')
  → Backend: Gọi PayOS API tạo payment link
  → Backend: UPDATE payos_orders (payment_link_id, checkout_url)
  → Frontend: window.location.href = checkoutUrl (redirect sang PayOS)
→ User thanh toán trên PayOS
→ PayOS redirect về /purchase?payosOrderCode=XXX
→ PurchaseSection useEffect phát hiện orderCode → POST /payos/confirm-return {orderCode}
  → Backend: Gọi PayOS API check status
  → Backend: INSERT payment + ticket records
  → Backend: UPDATE payos_orders (status='PAID', payment_id, ticket_ids_json)
→ Frontend: dispatch(resetCart()) → navigate("/customer")
```

**Flow thanh toán tại rạp:**
```
handleTicketPurchase()
→ POST /counter-orders/create {email, seatIds, userHallId, userMovieId, userShowtimeId}
  → Backend: buildPaymentOrderPayload() - kiểm tra ghế
  → Backend: INSERT payos_orders (status='UNPAID')
  → Backend: GỌI NGAY finalizePaymentOrderTickets() - tạo payment + tickets ngay
  → Trả về orderCode + tickets
→ Frontend: toast success, resetCart()
```

### 3.7. Xem thông tin cá nhân & Lịch sử vé

```
User vào /customer (ProtectedRoute)
→ POST /customerProfile {email, password} → SELECT * FROM person WHERE email=? AND password=?
→ POST /customerPurchases {email} → JOIN 8 bảng, lấy lịch sử mua vé
→ Hiển thị thông tin + danh sách vé đã mua
```

**⚠️ Vấn đề:**
- **Gửi password trong request** `/customerProfile`
- **Hủy vé gọi sai endpoint**: `CustomerInfoSection.jsx:88` gọi `/cancelTicket` nhưng server endpoint là `/cancelOneTicket` → LỖI 404

---

## 4. Luồng admin

### 4.1. Dashboard (Tổng quan)
```
→ GET /totalTickets (không cần auth!)
→ GET /totalPayment (không cần auth!)
→ GET /totalCustomers (không cần auth!)
→ GET /totalTicketPerMovie (không cần auth!)
```

**⚠️ NGHIÊM TRỌNG:** 4 endpoint dashboard này KHÔNG kiểm tra quyền admin - ai cũng có thể gọi.

### 4.2. Quản lý đơn hàng
```
→ POST /adminOrders {email, password, status} ← gửi password mỗi request
→ POST /adminOrderStatusUpdate {email, password, orderCode, status}
```

### 4.3. Quản lý phim
```
→ POST /adminMovies {email, password}
→ POST /adminMovieAdd {email, password, ...}
→ POST /adminMovieUpdate {email, password, movieId, ...}
→ POST /adminMovieDelete {email, password, movieId}
→ Thêm genre: POST /genreInsert {email, password, movieId, genre}
→ Thêm director: POST /directorInsert {email, password, movieId, director}
```

### 4.4. Quản lý lịch chiếu
```
→ POST /adminScheduleDateAdd, /adminScheduleDateUpdate, /adminScheduleDateDelete, /adminScheduleDateRestore
→ POST /adminShowtimeCreate, /adminShowtimeUpdate, /adminShowtimeDelete, /adminShowtimeRestore
→ POST /adminShowtimeOptions, /adminShowtimeSlots
```

---

## 5. Luồng thanh toán

### 5.1. PayOS flow
```
Frontend → POST /payos/create-payment-link → Backend kiểm tra ghế → INSERT payos_orders
→ Tạo link PayOS → Trả checkoutUrl → Redirect user → PayOS gateway
→ PayOS redirect → /purchase?payosOrderCode=XXX
→ POST /payos/confirm-return → Xác nhận với PayOS → finalizePaymentOrderTickets()
→ Tạo payment + tickets trong DB
```

### 5.2. PayOS webhook
```
PayOS gọi → POST /payos/webhook → verify webhook → finalizePaymentOrderTickets()
```

### 5.3. Legacy flow (cũ, KHÔNG CÒN DÙNG)
```
POST /payment → INSERT payment
POST /purchaseTicket → INSERT ticket (gọi cho mỗi ghế)
POST /recentPurchase → SELECT ticket by payment_id
```

**⚠️ Vấn đề:** Legacy endpoints vẫn hoạt động và không có auth - có thể bị lợi dụng.

---

## 6. Database schema

### 6.1. Danh sách bảng

| Bảng | Mục đích | Hàng dữ liệu | FK |
|------|----------|---------------|-----|
| `theatre` | Rạp CGV | 2 | - |
| `features` | Tính năng rạp | 8 | `theatre_id → theatre(id)` |
| `hall` | Phòng chiếu | 8 | `theatre_id → theatre(id)` |
| `hallwise_seat` | Nối phòng-ghế | 384 | `hall_id → hall(id)`, `seat_id → seat(id)` |
| `seat` | Ghế ngồi | 48 | - |
| `movie` | Phim | 6 | - |
| `movie_genre` | Thể loại phim | 18 | `movie_id → movie(id)` |
| `movie_directors` | Đạo diễn | 8 | `movie_id → movie(id)` |
| `showtimes` | Suất chiếu | 12 | - |
| `shown_in` | Nối phim-suất-phòng | ~80+ | `movie_id → movie(id)`, `showtime_id → showtimes(id)`, `hall_id → hall(id)` |
| `person` | Người dùng | 11 | - |
| `payment` | Thanh toán | 8+ | `customer_email → person(email)` |
| `ticket` | Vé | 25+ | `showtimes_id → showtimes(id)`, `payment_id → payment(id)`, `seat_id → seat(id)`, `hall_id → hall(id)`, `movie_id → movie(id)` |
| `payos_orders` | Đơn PayOS | auto | (không có FK rõ ràng, chỉ có index) |

### 6.2. Quan hệ
```
theatre (1) ──→ hall (n)
theatre (1) ──→ features (n)
hall (1) ──→ hallwise_seat (n)
seat (1) ──→ hallwise_seat (n)
movie (1) ──→ movie_genre (n)
movie (1) ──→ movie_directors (n)
movie (1) ──→ shown_in (n)
showtimes (1) ──→ shown_in (n)
hall (1) ──→ shown_in (n)
shown_in (n) ──→ ticket (n) [qua movie_id + hall_id + showtimes_id]
payment (1) ──→ ticket (n)
person (1) ──→ payment (n)
```

### 6.3. Các vấn đề về schema

| Vấn đề | Mô tả | Ảnh hưởng |
|---------|-------|------------|
| `payment.payment_status` | Thêm bằng migration, không có trong schema gốc | Medium |
| `payment` thiếu `ON DELETE CASCADE` | Khi xóa person, payment không tự xóa | Low |
| `movie.synopsis VARCHAR(500)` | Quá ngắn cho mô tả phim dài | Medium |
| `person.account_balance` | Có column nhưng không code nào dùng | Low |
| `ticket.purchase_date` là DATE | Không lưu giờ phút | Low |
| Không có `updated_at` ở đa số bảng | Không biết khi nào record được sửa | Medium |
| `users` table | `/api/register` tham chiếu đến bảng `users` không tồn tại | **HIGH** |
| `payos_orders` không có FK | Không ràng buộc với payment.id | Medium |

### 6.4. Trigger / Function / RLS
- **Không có trigger nào**
- **Không có stored function nào**
- **Không có RLS policies** (MySQL không hỗ trợ RLS như PostgreSQL)
- Tất cả bảo mật đều xử lý ở tầng application code

---

## 7. Các lỗi phát hiện

### 🔴 HIGH PRIORITY

#### H-1: Cancel ticket gọi sai endpoint
- **File:** `frontend/src/pages/CustomerInfo/components/CustomerInfoSection.jsx:88`
- **Lỗi:** Gọi `POST /cancelTicket` nhưng server chỉ có `POST /cancelOneTicket`
- **Ảnh hưởng:** HIGH - Người dùng không thể hủy vé, gặp lỗi 404
- **Cách fix:** Đổi URL thành `/cancelOneTicket`

#### H-2: Admin dashboard endpoints không có auth
- **File:** `backend/index.js:1495-1533`
- **Lỗi:** `GET /totalTickets`, `GET /totalPayment`, `GET /totalCustomers`, `GET /totalTicketPerMovie` không kiểm tra admin
- **Ảnh hưởng:** HIGH - Bất kỳ ai cũng có thể xem thống kê doanh thu
- **Cách fix:** Thêm xác thực admin cho các endpoint này

#### H-3: Password plaintext lưu trong localStorage + Redux
- **File:** `frontend/src/reducers/authSlice.js:18`, `frontend/src/modals/LoginModal.jsx:49`
- **Lỗi:** Password được lưu trong `localStorage` và Redux state dưới dạng plaintext
- **Ảnh hưởng:** HIGH - XSS attack có thể đánh cắp password
- **Cách fix:** Không lưu password ở client. Chỉ lưu token/session.

#### H-4: `/api/register` tham chiếu bảng `users` không tồn tại
- **File:** `backend/index.js:2460-2498`
- **Lỗi:** Endpoint `/api/register` dùng `INSERT INTO users` nhưng bảng `users` không tồn tại
- **Ảnh hưởng:** HIGH - Gọi endpoint này gây crash server
- **Cách fix:** Xóa endpoint hoặc sửa thành `person`

#### H-5: Toàn bộ admin auth gửi password trong request body
- **File:** `backend/index.js:1169-1176` + tất cả admin endpoints
- **Lỗi:** Mỗi request admin gửi `{email, password}` trong body - password lộ trong network tab
- **Ảnh hưởng:** HIGH - Admin password bị lộ qua HTTP request
- **Cách fix:** Implement JWT/session-based auth

### 🟡 MEDIUM PRIORITY

#### M-1: Duplicate admin endpoints (dead code)
- **Files:** `backend/index.js`:
  - `/adminMovieAdd1` (line 1633) - giống hệt `/adminMovieAdd`
  - `/genreInsert1` (line 1685) - giống hệt `/genreInsert`
  - `/directorInsert1` (line 1713) - giống hệt `/directorInsert`
  - `/showdateAdd1` (line 1750) - giống hệt `/showdateAdd`
  - `/lastShowDate1` (line 1740) - giống hệt `/lastShowDate`
- **Ảnh hưởng:** MEDIUM - Code dư thừa, khó maintain

#### M-2: Legacy payment endpoints vẫn hoạt động
- **Files:** `backend/index.js:675-764` - `/payment`, `/purchaseTicket`, `/recentPurchase`
- **Lỗi:** Các endpoint cũ không dùng nữa nhưng vẫn hoạt động và không có auth
- **Ảnh hưởng:** MEDIUM - Có thể bị lạm dụng để tạo fake orders
- **Cách fix:** Xóa hoặc thêm auth

#### M-3: Đăng ký không kiểm tra email trùng
- **File:** `backend/index.js:944-1003`
- **Lỗi:** Không kiểm tra email đã tồn tại trước khi INSERT
- **Ảnh hưởng:** MEDIUM - Nếu email trùng, MySQL báo lỗi, server trả về 500 mơ hồ
- **Cách fix:** Thêm `SELECT` kiểm tra trước INSERT

#### M-4: `shownInUpdate` hardcode movie IDs
- **File:** `backend/index.js:1783-1819`
- **Lỗi:** Hardcode mapping movie_id → hall_id cho 24 slot, chỉ hỗ trợ movie ID 1-6
- **Ảnh hưởng:** MEDIUM - Khi thêm phim mới, không tự động map được
- **Cách fix:** Dùng config động hoặc UI quản lý

#### M-5: Xử lý lỗi đăng ký trả về 500 mơ hồ
- **File:** `backend/index.js:991`
- **Lỗi:** `return res.status(500).json({ message: "Sorry, Please try again!" })` - không cho biết lý do
- **Ảnh hưởng:** MEDIUM - UX kém khi đăng ký thất bại

#### M-6: PayOS webhook không thông báo frontend real-time
- **File:** `backend/index.js:914-936`
- **Lỗi:** Webhook chỉ cập nhật DB, không push notification tới frontend
- **Ảnh hưởng:** MEDIUM - Nếu user đóng browser trước khi redirect, không biết kết quả

### 🟢 LOW PRIORITY

#### L-1: `movie.synopsis VARCHAR(500)` quá ngắn
- **File:** `database/movie_ticket_booking_website.sql:446`
- **Lỗi:** Chỉ 500 ký tự cho mô tả phim
- **Fix:** Đổi thành TEXT

#### L-2: Ticket purchase_date chỉ lưu date, không lưu time
- **File:** `backend/index.js:287-305`
- **Lỗi:** Dùng `getTodayDateKey()` chỉ lấy ngày
- **Fix:** Dùng NOW() hoặc datetime

#### L-3: Không có forgot password flow
- **Lỗi:** Hoàn toàn không có chức năng quên mật khẩu

#### L-4: `account_balance` column không được dùng
- **Lỗi:** Column tồn tại nhưng không code nào tham chiếu

#### L-5: Không validate email uniqueness khi đăng ký
- **Vấn đề:** Chỉ dựa vào primary key constraint, nếu fail trả về message mơ hồ

#### L-6: PurchaseSection không kiểm tra ghế double-booking khi thanh toán rạp
- **File:** `frontend/src/pages/Purchase/components/PurchaseSection.jsx:70-87`
- **Lỗi:** Khi tạo vé tại rạp, gọi `finalizePaymentOrderTickets` ngay trong cùng request - nếu 2 user cùng mua ghế giống nhau lúc gần như cùng lúc, cả 2 request đều pass `buildPaymentOrderPayload` (vì chưa có ticket nào trong DB) → double booking

#### L-7: `getHeldOrderSeatIds` không check hallId/movieId/showtimeId trong filter UNPAID
- **File:** `backend/index.js:150-186`
- **Lỗi:** Dòng 156: `WHERE status IN ('UNPAID', 'PENDING') AND payment_id IS NULL` - không filter theo hallId/movieId/showtimeId ở cấp SQL, chỉ filter ở application layer sau khi load ALL unpaid orders. Không scalable.

---

## 8. Rủi ro bảo mật

### 🔴 CRITICAL

| ID | Rủi ro | File | Mô tả |
|----|--------|------|-------|
| S-1 | **PayOS API Key lộ trong Git** | `backend/.env` | `PAYOS_API_KEY`, `PAYOS_CLIENT_ID`, `PAYOS_CHECKSUM_KEY` được commit vào Git repo (file .env không nằm trong `.gitignore`). Xem file: `backend/.env:19-22` |
| S-2 | **Database credentials lộ** | `backend/.env` | `DB_USER=movie_user`, `DB_PASSWORD=MovieBooking` - hardcoded và public trong Git |
| S-3 | **No password hashing** | `backend/index.js:944-1003, 1009-1027` | Mật khẩu lưu plaintext, truy vấn plaintext. Nếu DB bị leak, toàn bộ mật khẩu người dùng lộ |
| S-4 | **Admin auth gửi password trong request body** | Tất cả admin endpoints | Mỗi request gửi `{email, password}` - lộ trong network tab browser, log server |

### 🟡 HIGH

| ID | Rủi ro | Mô tả |
|----|--------|-------|
| S-5 | **Không có JWT/session** | Hoàn toàn dựa vào localStorage - có thể giả mạo auth |
| S-6 | **API dashboard không auth** | Bất kỳ ai cũng gọi được thống kê |
| S-7 | **No rate limiting trên login** | Có thể brute force password |
| S-8 | **Password gửi cho customerProfile** | Gửi password trong request `/customerProfile` |
| S-9 | **CORS quá rộng** | `corsOrigins` từ env - nếu không config có thể cho phép mọi origin |

### 🟡 MEDIUM

| ID | Rủi ro | Mô tả |
|----|--------|-------|
| S-10 | **Legacy payment endpoints không auth** | `/payment`, `/purchaseTicket`, `/recentPurchase` |
| S-11 | **No input validation ở nhiều chỗ** | Ví dụ: `rating`, `duration` không được validate kiểu dữ liệu |
| S-12 | **DB connection dùng 1 connection duy nhất** | Không pool, không transaction cho hầu hết operations |

---

## 9. Đề xuất cải thiện

### 9.1. Bảo mật (Ưu tiên cao nhất)

1. **Xóa `.env` khỏi Git history** và thêm vào `.gitignore`
2. **Implement JWT-based authentication** thay vì gửi password mỗi request
3. **Hash password với bcrypt** (cả register và login)
4. **Rate limiting** trên tất cả endpoints, đặc biệt `/login`
5. **Thêm auth cho admin dashboard endpoints** (`GET /totalTickets`, etc.)
6. **Xóa legacy endpoints** hoặc thêm auth
7. **Không lưu password trong localStorage** - chỉ lưu token

### 9.2. Database

1. **Đổi `synopsis` thành TEXT** (hoặc VARCHAR(2000))
2. **Thêm `updated_at` timestamp** cho các bảng chính
3. **Thêm UNIQUE constraint cho `person.email`**
4. **Xóa bỏ `account_balance` nếu không dùng**
5. **Xóa endpoint `/api/register`** tham chiếu bảng `users` không tồn tại
6. **Thêm FK `payos_orders.payment_id → payment.id`**

### 9.3. Code quality

1. **Xóa duplicate endpoints** (các endpoint `*1` như `adminMovieAdd1`, `genreInsert1`, etc.)
2. **Fix cancel ticket endpoint** (`/cancelTicket` → `/cancelOneTicket`)
3. **Sửa lỗi đăng ký email trùng** - thêm kiểm tra trước INSERT
4. **Thêm transaction cho counter-orders/create** (đã có nhưng cần review race condition)

### 9.4. UX

1. **Thêm forgot password flow**
2. **Thêm email confirmation sau khi đặt vé thành công**
3. **Cải thiện error messages** (không trả về 500 mơ hồ)
4. **Thêm loading states cho tất cả async operations**

---

## 10. Checklist các việc cần sửa theo thứ tự ưu tiên

### GIAI ĐOẠN 1: Critical Security (làm ngay)

- [ ] **S-1, S-2**: Remove `.env` khỏi Git, rotate all credentials (DB, PayOS, OpenAI)
- [ ] **S-3**: Implement password hashing với bcrypt
- [ ] **S-4**: Implement JWT auth, xóa password khỏi request body
- [ ] **H-3**: Xóa password khỏi localStorage/Redux
- [ ] **S-6**: Thêm auth cho dashboard endpoints

### GIAI ĐOẠN 2: Bug Critical (làm ngay)

- [ ] **H-1**: Fix cancel ticket endpoint URL
- [ ] **H-4**: Xóa hoặc sửa endpoint `/api/register`
- [ ] **H-2**: Thêm admin check cho 4 dashboard endpoints

### GIAI ĐOẠN 3: Medium Bugs

- [ ] **M-1**: Xóa duplicate admin endpoints (`*1`)
- [ ] **M-2**: Xóa hoặc bảo vệ legacy payment endpoints
- [ ] **M-3**: Thêm kiểm tra email trùng khi đăng ký
- [ ] **M-5**: Cải thiện error message đăng ký
- [ ] **L-1**: Đổi `synopsis` thành TEXT

### GIAI ĐOẠN 4: Architecture Improvements

- [ ] **S-7**: Thêm rate limiting cho login
- [ ] **M-6**: Thêm real-time notification cho PayOS webhook (WebSocket/Socket.IO)
- [ ] **L-6**: Fix race condition double-booking
- [ ] **L-3**: Thêm forgot password flow
- [ ] **L-7**: Tối ưu `getHeldOrderSeatIds` - filter theo hall/movie/showtime trong SQL
- [ ] **M-4**: Refactor `shownInUpdate` thành dynamic

### GIAI ĐOẠN 5: Code Quality

- [ ] Xóa `account_balance` column khỏi `person` (nếu không dùng)
- [ ] Thêm `updated_at` cho các bảng
- [ ] Implement DB connection pool
- [ ] Refactor `backend/index.js` (2503 dòng) thành nhiều module nhỏ
- [ ] Thêm TypeScript cho frontend
- [ ] Thêm API documentation (Swagger/OpenAPI)

---

## PHỤ LỤC A: File chứa credential lộ

```
backend/.env:
- DB_HOST=36.50.27.243
- DB_USER=movie_user
- DB_PASSWORD=MovieBooking
- PAYOS_API_KEY=1820f9a6-2ad3-4a24-a80f-c08f555776a0
- PAYOS_CLIENT_ID=67be869e-4002-438d-b190-57b7facdce32
- PAYOS_CHECKSUM_KEY=5cc12400e674ac049f400b1fdf0485d3c20ed81cc9483e38b4a48a915662c347
```

## PHỤ LỤC B: Component usage audit

| Component | File | Used? | Notes |
|-----------|------|-------|-------|
| `CollectionCard` | `frontend/src/components/CollectionCard.jsx` | ❓ TODO: kiểm tra | Có thể unused |
| `ChatbotWidget` | `frontend/src/components/ChatbotWidget.jsx` | ✅ `App.jsx:104` | |
| `Footer` | `frontend/src/components/Footer.jsx` | ✅ Imported in pages | |
| `LocationSelector` | `frontend/src/components/LocationSelector.jsx` | ✅ Purchase + MovieDetails | |
| `MobileNav` | `frontend/src/components/MobileNav.jsx` | ✅ `App.jsx:103` | |
| `Navbar` | `frontend/src/components/Navbar.jsx` | ✅ Imported in pages | |
| `PageLoader` | `frontend/src/components/PageLoader.jsx` | ✅ `App.jsx:58` | |
| `ProtectedRoute` | `frontend/src/components/ProtectedRoute.jsx` | ✅ `App.jsx:66-87` | |
| `ScrollToTop` | `frontend/src/components/ScrollToTop.jsx` | ✅ `App.jsx:57` | |
| `TextEffect` | `frontend/src/components/TextEffect.jsx` | ❓ Chưa rõ | |
| `TopEdge` | `frontend/src/components/TopEdge.jsx` | ❓ Chưa rõ | |

## PHỤ LỤC C: Dead code analysis

| Code | Lý do dead |
|------|------------|
| `backend/index.js:675-764` (`/payment`, `/purchaseTicket`, `/recentPurchase`) | Flow cũ, thay bằng PayOS flow |
| `backend/index.js:1633` (`/adminMovieAdd1`) | Duplicate của `/adminMovieAdd` |
| `backend/index.js:1685` (`/genreInsert1`) | Duplicate của `/genreInsert` |
| `backend/index.js:1713` (`/directorInsert1`) | Duplicate của `/directorInsert` |
| `backend/index.js:1740` (`/lastShowDate1`) | Duplicate của `/lastShowDate` |
| `backend/index.js:1750` (`/showdateAdd1`) | Duplicate của `/showdateAdd` |
| `backend/index.js:1843` (`/adminShowtimes`) | Có thể không còn dùng |
| `backend/index.js:1867-1939` (`/movieReplaceFrom`, `/movieReplaceTo`, `/movieSwap`) | UI tương ứng không tồn tại |
| `backend/index.js:2460-2498` (`/api/register`) | Bảng `users` không tồn tại |
| `backend/index.js:1783-1819` (`/shownInUpdate`) | Hardcode, không có UI gọi |
| `person.account_balance` | Không code nào tham chiếu |
| `PAYOS_API_KEY`, `PAYOS_CLIENT_ID`, `PAYOS_CHECKSUM_KEY` | Nên là env không commit |

---

**Kết luận:** Dự án có kiến trúc tổng quan tốt với nhiều tính năng, nhưng có **vấn đề bảo mật nghiêm trọng** (API keys lộ, password plaintext, không JWT) và **một số bug blocking** (cancel ticket sai endpoint, API register chết). Cần ưu tiên xử lý Giai đoạn 1 và 2 trước khi triển khai production.

**Tổng số lỗi:**
- 🔴 Critical: 5
- 🟡 Medium: 6
- 🟢 Low: 7
- 🔴 Security Critical: 4
- 🟡 Security High: 5
- 🟡 Security Medium: 3
