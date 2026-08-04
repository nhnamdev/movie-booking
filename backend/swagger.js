const fieldSchemas = {
  email: { type: "string", format: "email", example: "customer@example.com" },
  password: { type: "string", format: "password", example: "your-password" },
  firstName: { type: "string", example: "An" },
  lastName: { type: "string", example: "Nguyễn" },
  phoneNumber: { type: "string", pattern: "^0\\d{9}$", example: "0901234567" },
  theatreName: { type: "string", example: "CGV Vincom Center Landmark 81" },
  userGenre: { type: "string", example: "All" },
  theatreId: { type: "integer", example: 1 },
  userDate: { type: "string", format: "date", example: "2026-08-04" },
  userMovieId: { type: "integer", example: 1 },
  userHallId: { type: "integer", example: 1 },
  userShowtimeId: { type: "integer", example: 1 },
  ticketId: { type: "integer", example: 1 },
  movieDetailsId: { type: "integer", example: 1 },
  seatIds: { type: "array", items: { type: "integer" }, example: [1, 2] },
  amount: { type: "number", example: 240000 },
  userPayMethod: { type: "string", example: "PayOS" },
  price: { type: "number", example: 120000 },
  purchase_date: { type: "string", format: "date", example: "2026-08-04" },
  paymentID: { type: "integer", example: 1 },
  seatId: { type: "integer", example: 1 },
  orderCode: { type: "integer", format: "int64", example: 1722772800001 },
  status: { type: "string", example: "PAID" },
  movieId: { type: "integer", example: 1 },
  name: { type: "string", example: "Tên phim" },
  image_path: { type: "string", format: "uri", example: "https://example.com/movie.webp" },
  language: { type: "string", example: "Tiếng Việt" },
  synopsis: { type: "string", example: "Nội dung phim" },
  rating: { type: "number", format: "float", example: 8.5 },
  duration: { type: "integer", example: 120 },
  top_cast: { type: "string", example: "Diễn viên A, Diễn viên B" },
  release_date: { type: "string", format: "date", example: "2026-08-04" },
  genres: { type: "array", items: { type: "string" }, example: ["Hành động"] },
  directors: { type: "array", items: { type: "string" }, example: ["Đạo diễn A"] },
  genre: { type: "string", example: "Hành động" },
  director: { type: "string", example: "Đạo diễn A" },
  selectedShowDate: { type: "string", format: "date", example: "2026-08-04" },
  showtimeId: { type: "integer", example: 1 },
  selectedShowtime: { type: "integer", example: 1 },
  selectedAlt: { type: "integer", example: 2 },
  selectedReplace: { type: "integer", example: 1 },
  showtimeDate: { type: "string", format: "date", example: "2026-08-04" },
  currentDate: { type: "string", format: "date", example: "2026-08-04" },
  nextDate: { type: "string", format: "date", example: "2026-08-05" },
  selectedShowDateOptional: { type: "string", format: "date", example: "2026-08-04" },
  hallId: { type: "integer", example: 1 },
  movieStartTime: { type: "string", example: "19:30:00" },
  showType: { type: "string", example: "2D" },
  screenType: { type: "string", example: "Tiêu chuẩn" },
  pricePerSeat: { type: "number", example: 120000 },
  originalMovieId: { type: "integer", example: 1 },
  originalHallId: { type: "integer", example: 1 },
};

const jsonBody = (fields, optional = []) => ({
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: Object.fromEntries(
          fields.map((field) => [field, fieldSchemas[field] || { type: "string" }])
        ),
        required: fields.filter((field) => !optional.includes(field)),
      },
    },
  },
});

const adminCredentials = ["email", "password"];
const paymentSelection = [
  "email",
  "seatIds",
  "userHallId",
  "userMovieId",
  "userShowtimeId",
];

const endpoints = [
  ["get", "/", "System", "Kiểm tra backend"],
  ["get", "/latestMovies", "Catalog", "Lấy danh sách phim mới nhất"],
  ["get", "/locationDetails", "Catalog", "Lấy thông tin địa điểm rạp"],
  ["get", "/locationFeatures", "Catalog", "Lấy tiện ích của rạp"],
  ["get", "/theatres", "Catalog", "Lấy danh sách rạp"],
  ["get", "/genres", "Catalog", "Lấy danh sách thể loại"],
  ["post", "/showtimes", "Catalog", "Tìm lịch chiếu theo rạp và thể loại", ["theatreName", "userGenre"]],
  ["post", "/showtimesDates", "Booking", "Lấy các ngày chiếu của rạp", ["theatreId"]],
  ["post", "/uniqueMovies", "Booking", "Lấy phim theo rạp và ngày", ["theatreId", "userDate"]],
  ["post", "/halls", "Booking", "Lấy phòng và suất chiếu phù hợp", ["theatreId", "userDate", "userMovieId"]],
  ["post", "/seats", "Booking", "Lấy trạng thái ghế", ["userShowtimeId", "userHallId", "userMovieId"]],
  ["post", "/payment", "Legacy", "Tạo thanh toán kiểu cũ (đã ngừng dùng)", [...adminCredentials, "amount", "userPayMethod"]],
  ["post", "/purchaseTicket", "Legacy", "Mua vé kiểu cũ (đã ngừng dùng)", [...adminCredentials, "price", "purchase_date", "paymentID", "seatId", "userHallId", "userMovieId", "userShowtimeId"]],
  ["post", "/recentPurchase", "Legacy", "Lấy vé vừa mua kiểu cũ (đã ngừng dùng)", [...adminCredentials, "paymentID"]],
  ["post", "/payos/create-payment-link", "Payment", "Tạo liên kết thanh toán PayOS", paymentSelection],
  ["post", "/counter-orders/create", "Payment", "Tạo đơn thanh toán tại rạp", paymentSelection],
  ["post", "/payos/confirm-return", "Payment", "Xác nhận kết quả trả về từ PayOS", ["orderCode"]],
  ["post", "/payos/webhook", "Payment", "Nhận webhook PayOS", [], [], { type: "object", additionalProperties: true }],
  ["post", "/registration", "Authentication", "Đăng ký tài khoản", ["email", "firstName", "lastName", "password", "phoneNumber"]],
  ["post", "/login", "Authentication", "Đăng nhập", ["email", "password"]],
  ["post", "/movieDetail", "Catalog", "Lấy chi tiết phim", ["movieDetailsId"]],
  ["post", "/movieWiseShowtime", "Catalog", "Lấy lịch chiếu của phim", ["movieDetailsId", "theatreId"]],
  ["post", "/otherMovies", "Catalog", "Lấy các phim khác", ["movieDetailsId"]],
  ["post", "/customerProfile", "Customer", "Lấy hồ sơ khách hàng", ["email", "password"]],
  ["post", "/customerPurchases", "Customer", "Lấy lịch sử mua vé", ["email"]],
  ["post", "/cancelOneTicket", "Customer", "Huỷ một vé", ["ticketId"]],
  ["post", "/adminOrders", "Admin - Orders", "Lấy danh sách đơn hàng", [...adminCredentials, "status"], ["status"]],
  ["post", "/adminOrderStatusUpdate", "Admin - Orders", "Cập nhật trạng thái đơn hàng", [...adminCredentials, "orderCode", "status"]],
  ["post", "/adminMovies", "Admin - Movies", "Lấy danh sách phim quản trị", adminCredentials],
  ["post", "/adminMovieUpdate", "Admin - Movies", "Cập nhật phim", [...adminCredentials, "movieId", "name", "image_path", "language", "synopsis", "rating", "duration", "top_cast", "release_date", "genres", "directors"]],
  ["post", "/adminMovieDelete", "Admin - Movies", "Xoá phim chưa có vé", [...adminCredentials, "movieId"]],
  ["post", "/adminMovieAdd", "Admin - Movies", "Thêm phim", [...adminCredentials, "name", "image_path", "language", "synopsis", "rating", "duration", "top_cast", "release_date"]],
  ["post", "/genreInsert", "Admin - Movies", "Thêm thể loại cho phim", [...adminCredentials, "movieId", "genre"]],
  ["post", "/directorInsert", "Admin - Movies", "Thêm đạo diễn cho phim", [...adminCredentials, "movieId", "director"]],
  ["get", "/lastShowDate", "Admin - Schedule", "Lấy ngày chiếu cuối cùng"],
  ["get", "/adminLatestShowDates", "Admin - Schedule", "Lấy các ngày chiếu mới nhất"],
  ["post", "/showdateAdd", "Admin - Schedule", "Thêm nhóm ngày chiếu kiểu cũ", [...adminCredentials, "selectedShowDate"]],
  ["post", "/shownInUpdate", "Admin - Schedule", "Gán phim vào suất chiếu kiểu cũ", [...adminCredentials, "showtimeId"]],
  ["post", "/adminShowtimes", "Admin - Schedule", "Lấy suất chiếu theo ngày", [...adminCredentials, "selectedShowDate"]],
  ["post", "/movieReplaceFrom", "Admin - Schedule", "Lấy phim đang gán vào suất chiếu", [...adminCredentials, "selectedShowtime"]],
  ["post", "/movieReplaceTo", "Admin - Schedule", "Lấy phim có thể thay thế", [...adminCredentials, "selectedShowtime"]],
  ["post", "/movieSwap", "Admin - Schedule", "Thay phim trong suất chiếu", [...adminCredentials, "selectedAlt", "selectedShowtime", "selectedReplace"]],
  ["post", "/adminScheduleDates", "Admin - Schedule", "Thống kê các ngày chiếu", adminCredentials],
  ["post", "/adminScheduleDateAdd", "Admin - Schedule", "Thêm ngày chiếu", [...adminCredentials, "showtimeDate"]],
  ["post", "/adminScheduleDateUpdate", "Admin - Schedule", "Đổi ngày chiếu", [...adminCredentials, "currentDate", "nextDate"]],
  ["post", "/adminScheduleDateDelete", "Admin - Schedule", "Xoá hoặc ngưng ngày chiếu", [...adminCredentials, "showtimeDate"]],
  ["post", "/adminScheduleDateRestore", "Admin - Schedule", "Khôi phục ngày chiếu", [...adminCredentials, "showtimeDate"]],
  ["post", "/adminShowtimeOptions", "Admin - Schedule", "Lấy dữ liệu chọn cho form suất chiếu", adminCredentials],
  ["post", "/adminShowtimeSlots", "Admin - Schedule", "Lấy danh sách suất chiếu quản trị", [...adminCredentials, "selectedShowDate"], ["selectedShowDate"]],
  ["post", "/adminShowtimeCreate", "Admin - Schedule", "Tạo suất chiếu", [...adminCredentials, "movieId", "hallId", "showtimeDate", "movieStartTime", "showType", "screenType", "pricePerSeat"]],
  ["post", "/adminShowtimeUpdate", "Admin - Schedule", "Cập nhật suất chiếu", [...adminCredentials, "originalMovieId", "originalHallId", "showtimeId", "movieId", "hallId", "showtimeDate", "movieStartTime", "showType", "screenType", "pricePerSeat"]],
  ["post", "/adminShowtimeDelete", "Admin - Schedule", "Xoá hoặc ngưng suất chiếu", [...adminCredentials, "movieId", "hallId", "showtimeId"]],
  ["post", "/adminShowtimeRestore", "Admin - Schedule", "Khôi phục suất chiếu", [...adminCredentials, "movieId", "hallId", "showtimeId"]],
  ["post", "/totalTickets", "Admin - Analytics", "Đếm tổng số vé", adminCredentials],
  ["post", "/totalPayment", "Admin - Analytics", "Tính tổng thanh toán", adminCredentials],
  ["post", "/totalCustomers", "Admin - Analytics", "Đếm tổng khách hàng", adminCredentials],
  ["post", "/totalTicketPerMovie", "Admin - Analytics", "Thống kê vé theo phim", adminCredentials],
  ["post", "/adminDashboardStats", "Admin - Analytics", "Lấy số liệu tổng quan dashboard", adminCredentials],
  ["post", "/adminRevenueStats", "Admin - Analytics", "Lấy doanh thu 30 ngày", adminCredentials],
  ["post", "/adminOrderStatusStats", "Admin - Analytics", "Thống kê trạng thái đơn", adminCredentials],
  ["post", "/adminBookingTimeStats", "Admin - Analytics", "Thống kê khung giờ đặt vé", adminCredentials],
  ["post", "/adminRecentOrders", "Admin - Analytics", "Lấy các đơn gần đây", adminCredentials],
  ["post", "/adminTopMovies", "Admin - Analytics", "Lấy các phim bán chạy", adminCredentials],
];

const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "CGV Booking API",
    version: "1.0.0",
    description:
      "Tài liệu API cho hệ thống đặt vé CGV. Các API quản trị hiện xác thực bằng email và password trong request body theo implementation hiện tại.",
  },
  servers: [{ url: "/", description: "Máy chủ hiện tại" }],
  tags: [
    "System",
    "Catalog",
    "Booking",
    "Payment",
    "Authentication",
    "Customer",
    "Admin - Orders",
    "Admin - Movies",
    "Admin - Schedule",
    "Admin - Analytics",
    "Legacy",
  ].map((name) => ({ name })),
  paths: {},
  components: {
    schemas: {
      ApiError: {
        type: "object",
        properties: {
          message: { type: "string" },
          error: { type: "string" },
        },
        additionalProperties: true,
      },
      ApiPayload: {
        oneOf: [
          { type: "object", additionalProperties: true },
          { type: "array", items: {} },
          { type: "string" },
        ],
      },
    },
  },
};

const defaultResponses = {
  200: {
    description: "Thành công",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ApiPayload" } } },
  },
  400: {
    description: "Dữ liệu yêu cầu không hợp lệ",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
  },
  403: {
    description: "Không có quyền truy cập",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
  },
  404: {
    description: "Không tìm thấy dữ liệu",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
  },
  409: {
    description: "Dữ liệu xung đột với trạng thái hiện tại",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
  },
  500: {
    description: "Lỗi máy chủ",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
  },
};

for (const [method, path, tag, summary, fields, optional = [], customSchema] of endpoints) {
  const operation = {
    tags: [tag],
    summary,
    operationId: `${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "root"}`,
    responses: defaultResponses,
  };

  if (method !== "get") {
    operation.requestBody = customSchema
      ? { required: true, content: { "application/json": { schema: customSchema } } }
      : jsonBody(fields || [], optional);
  }

  swaggerDocument.paths[path] = swaggerDocument.paths[path] || {};
  swaggerDocument.paths[path][method] = operation;
}

swaggerDocument.paths["/payment"].post.deprecated = true;
swaggerDocument.paths["/payment"].post.tags = ["Legacy"];
swaggerDocument.paths["/payment"].post.summary = "Tạo thanh toán kiểu cũ (đã ngừng dùng)";
swaggerDocument.paths["/purchaseTicket"].post.deprecated = true;
swaggerDocument.paths["/purchaseTicket"].post.tags = ["Legacy"];
swaggerDocument.paths["/purchaseTicket"].post.summary = "Mua vé kiểu cũ (đã ngừng dùng)";
swaggerDocument.paths["/recentPurchase"].post.deprecated = true;
swaggerDocument.paths["/recentPurchase"].post.tags = ["Legacy"];
swaggerDocument.paths["/recentPurchase"].post.summary = "Lấy vé vừa mua kiểu cũ (đã ngừng dùng)";

swaggerDocument.paths["/adminUploadImage"] = {
  post: {
    tags: ["Admin - Movies"],
    summary: "Tải ảnh phim lên Cloudflare R2",
    operationId: "post_adminUploadImage",
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            required: ["email", "password", "image"],
            properties: {
              email: fieldSchemas.email,
              password: fieldSchemas.password,
              image: { type: "string", format: "binary" },
            },
          },
        },
      },
    },
    responses: defaultResponses,
  },
};

module.exports = swaggerDocument;
