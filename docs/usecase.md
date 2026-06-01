# Use Case - Website đặt vé xem phim CGV

## Giả định khi vẽ

- Sơ đồ dựa trên source hiện tại trong `frontend/src`, `backend/index.js`, `backend/ai/routes.js` và `database/movie_ticket_booking_website.sql`.
- Không vẽ MySQL như một actor vì cơ sở dữ liệu là thành phần nội bộ của hệ thống, không phải tác nhân bên ngoài.
- `AISearchBox` và API `/ai/search` có tồn tại nhưng `ShowtimesPage.jsx` hiện chưa render component này, nên không đưa vào sơ đồ chính.
- UI có nút hủy vé, backend có `/cancelOneTicket`, nhưng frontend đang gọi `/cancelTicket`. Chức năng này chưa khớp endpoint, nên chỉ ghi chú, không đưa vào use case chính.

## Tác nhân

- **Khách vãng lai:** người dùng chưa đăng nhập, có thể xem phim, lịch chiếu, chi tiết phim, đăng ký, đăng nhập và dùng chatbot.
- **Khách hàng:** người dùng có `person_type = Customer`, có thể đặt vé, xem thông tin cá nhân, xem lịch sử mua vé và nhận gợi ý phim.
- **Quản trị viên:** người dùng có `person_type = Admin`, có thể vào trang quản trị, xem thống kê, quản lý phim và lịch chiếu.
- **Dịch vụ OpenAI:** tác nhân phụ phục vụ chatbot, gợi ý phim, sinh mô tả phim và phân tích kinh doanh.

## Sơ đồ use case

```mermaid
flowchart LR
  Guest["Khách vãng lai"]
  Customer["Khách hàng"]
  Admin["Quản trị viên"]
  OpenAI["Dịch vụ OpenAI"]

  Customer -. kế thừa .-> Guest
  Admin -. kế thừa .-> Guest

  subgraph System["Website đặt vé xem phim CGV"]
    UC_Home(["Xem trang chủ và phim mới"])
    UC_Location(["Chọn rạp / khu vực"])
    UC_Showtimes(["Xem lịch chiếu và bảng giá vé"])
    UC_Detail(["Xem chi tiết phim"])
    UC_Register(["Đăng ký tài khoản"])
    UC_Login(["Đăng nhập"])
    UC_Chat(["Chatbot hỗ trợ"])

    UC_Book(["Đặt vé xem phim"])
    UC_SelectDate(["Chọn ngày chiếu"])
    UC_SelectMovie(["Chọn phim"])
    UC_SelectShow(["Chọn suất chiếu và phòng chiếu"])
    UC_SelectSeat(["Chọn ghế"])
    UC_SelectPayment(["Chọn phương thức thanh toán"])
    UC_Pay(["Thanh toán và tạo vé"])
    UC_Profile(["Xem thông tin cá nhân"])
    UC_History(["Xem lịch sử mua vé"])
    UC_Recommend(["Nhận gợi ý phim cá nhân hóa"])

    UC_AdminDashboard(["Xem tổng quan vé / doanh thu / khách hàng"])
    UC_TicketsByMovie(["Xem vé bán theo từng phim"])
    UC_MovieManage(["Quản lý phim"])
    UC_AddMovie(["Thêm phim"])
    UC_UpdateMovie(["Cập nhật phim"])
    UC_DeleteMovie(["Xóa phim"])
    UC_AddShowDate(["Thêm ngày chiếu"])
    UC_ModifySchedule(["Cập nhật lịch chiếu phim"])
    UC_AIDescription(["Sinh mô tả phim bằng AI"])
    UC_AIAnalytics(["Phân tích kinh doanh bằng AI"])
  end

  Guest --> UC_Home
  Guest --> UC_Location
  Guest --> UC_Showtimes
  Guest --> UC_Detail
  Guest --> UC_Register
  Guest --> UC_Login
  Guest --> UC_Chat

  Customer --> UC_Book
  Customer --> UC_Profile
  Customer --> UC_History
  Customer --> UC_Recommend

  Admin --> UC_AdminDashboard
  Admin --> UC_TicketsByMovie
  Admin --> UC_MovieManage
  Admin --> UC_AddShowDate
  Admin --> UC_ModifySchedule
  Admin --> UC_AIAnalytics

  UC_Book -. "<<include>>" .-> UC_SelectDate
  UC_Book -. "<<include>>" .-> UC_SelectMovie
  UC_Book -. "<<include>>" .-> UC_SelectShow
  UC_Book -. "<<include>>" .-> UC_SelectSeat
  UC_Book -. "<<include>>" .-> UC_SelectPayment
  UC_Book -. "<<include>>" .-> UC_Pay

  UC_MovieManage -. "<<include>>" .-> UC_AddMovie
  UC_MovieManage -. "<<include>>" .-> UC_UpdateMovie
  UC_MovieManage -. "<<include>>" .-> UC_DeleteMovie
  UC_AddMovie -. "<<extend>>" .-> UC_AIDescription

  OpenAI --> UC_Chat
  OpenAI --> UC_Recommend
  OpenAI --> UC_AIDescription
  OpenAI --> UC_AIAnalytics
```

## Ghi chú chức năng đang có nhưng chưa nên đưa vào sơ đồ chính

- **Tìm kiếm phim bằng AI:** có `AISearchBox.jsx` và `/ai/search`, nhưng chưa được gắn vào `ShowtimesPage.jsx`.
- **Hủy vé:** có nút hủy vé trong `CustomerInfoSection.jsx`, nhưng endpoint frontend/backend chưa đồng bộ (`/cancelTicket` khác `/cancelOneTicket`).
- **Endpoint `/api/register`:** backend có endpoint này nhưng schema SQL không có bảng `users`, trong khi flow đăng ký thật đang dùng `/registration` và bảng `person`.

## File PlantUML

Nếu cần nộp theo dạng UML chuẩn, dùng file `docs/usecase.puml`.
