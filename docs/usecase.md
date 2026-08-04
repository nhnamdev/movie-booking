# Use Case - Website đặt vé xem phim CGV

## Giả định khi vẽ

- Sơ đồ dựa trên source hiện tại trong `frontend/src`, `backend/index.js` và `database/movie_ticket_booking_website.sql`.
- Không vẽ MySQL như một actor vì cơ sở dữ liệu là thành phần nội bộ của hệ thống, không phải tác nhân bên ngoài.
- UI có nút hủy vé, backend có `/cancelOneTicket`, nhưng frontend đang gọi `/cancelTicket`. Chức năng này chưa khớp endpoint, nên chỉ ghi chú, không đưa vào use case chính.

## Tác nhân

- **Khách vãng lai:** người dùng chưa đăng nhập, có thể xem phim, lịch chiếu, chi tiết phim, đăng ký và đăng nhập.
- **Khách hàng:** người dùng có `person_type = Customer`, có thể đặt vé, xem thông tin cá nhân và xem lịch sử mua vé.
- **Quản trị viên:** người dùng có `person_type = Admin`, có thể vào trang quản trị, xem thống kê, quản lý phim và lịch chiếu.

## Sơ đồ use case

```mermaid
flowchart LR
  Guest["Khách vãng lai"]
  Customer["Khách hàng"]
  Admin["Quản trị viên"]

  Customer -. kế thừa .-> Guest
  Admin -. kế thừa .-> Guest

  subgraph System["Website đặt vé xem phim CGV"]
    UC_Home(["Xem trang chủ và phim mới"])
    UC_Location(["Chọn rạp / khu vực"])
    UC_Showtimes(["Xem lịch chiếu và bảng giá vé"])
    UC_Detail(["Xem chi tiết phim"])
    UC_Register(["Đăng ký tài khoản"])
    UC_Login(["Đăng nhập"])

    UC_Book(["Đặt vé xem phim"])
    UC_SelectDate(["Chọn ngày chiếu"])
    UC_SelectMovie(["Chọn phim"])
    UC_SelectShow(["Chọn suất chiếu và phòng chiếu"])
    UC_SelectSeat(["Chọn ghế"])
    UC_SelectPayment(["Chọn phương thức thanh toán"])
    UC_Pay(["Thanh toán và tạo vé"])
    UC_Profile(["Xem thông tin cá nhân"])
    UC_History(["Xem lịch sử mua vé"])

    UC_AdminDashboard(["Xem tổng quan vé / doanh thu / khách hàng"])
    UC_TicketsByMovie(["Xem vé bán theo từng phim"])
    UC_MovieManage(["Quản lý phim"])
    UC_AddMovie(["Thêm phim"])
    UC_UpdateMovie(["Cập nhật phim"])
    UC_DeleteMovie(["Xóa phim"])
    UC_AddShowDate(["Thêm ngày chiếu"])
    UC_ModifySchedule(["Cập nhật lịch chiếu phim"])
  end

  Guest --> UC_Home
  Guest --> UC_Location
  Guest --> UC_Showtimes
  Guest --> UC_Detail
  Guest --> UC_Register
  Guest --> UC_Login

  Customer --> UC_Book
  Customer --> UC_Profile
  Customer --> UC_History

  Admin --> UC_AdminDashboard
  Admin --> UC_TicketsByMovie
  Admin --> UC_MovieManage
  Admin --> UC_AddShowDate
  Admin --> UC_ModifySchedule

  UC_Book -. "<<include>>" .-> UC_SelectDate
  UC_Book -. "<<include>>" .-> UC_SelectMovie
  UC_Book -. "<<include>>" .-> UC_SelectShow
  UC_Book -. "<<include>>" .-> UC_SelectSeat
  UC_Book -. "<<include>>" .-> UC_SelectPayment
  UC_Book -. "<<include>>" .-> UC_Pay

  UC_MovieManage -. "<<include>>" .-> UC_AddMovie
  UC_MovieManage -. "<<include>>" .-> UC_UpdateMovie
  UC_MovieManage -. "<<include>>" .-> UC_DeleteMovie
```

## Ghi chú chức năng đang có nhưng chưa nên đưa vào sơ đồ chính

- **Hủy vé:** có nút hủy vé trong `CustomerInfoSection.jsx`, nhưng endpoint frontend/backend chưa đồng bộ (`/cancelTicket` khác `/cancelOneTicket`).
- **Endpoint `/api/register`:** backend có endpoint này nhưng schema SQL không có bảng `users`, trong khi flow đăng ký thật đang dùng `/registration` và bảng `person`.

## File PlantUML

Nếu cần nộp theo dạng UML chuẩn, dùng file `docs/usecase.puml`.
