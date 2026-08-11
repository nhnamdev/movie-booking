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
  comboItems: {
    type: "array",
    items: {
      type: "object",
      required: ["comboId", "quantity"],
      properties: {
        comboId: { type: "integer", example: 1 },
        quantity: { type: "integer", minimum: 1, maximum: 10, example: 1 },
      },
    },
  },
  items: {
    type: "array",
    minItems: 1,
    items: {
      type: "object",
      required: ["comboId", "quantity"],
      properties: {
        comboId: { type: "integer", example: 1 },
        quantity: { type: "integer", minimum: 1, maximum: 10, example: 2 },
      },
    },
  },
  amount: { type: "number", example: 240000 },
  userPayMethod: { type: "string", example: "PayOS" },
  price: { type: "number", example: 120000 },
  purchase_date: { type: "string", format: "date", example: "2026-08-04" },
  paymentID: { type: "integer", example: 1 },
  seatId: { type: "integer", example: 1 },
  orderCode: { type: "integer", format: "int64", example: 1722772800001 },
  status: {
    type: "string",
    enum: ["UNPAID", "PENDING", "PAID", "FAILED", "EXPIRED", "PAID_REVIEW", "PREPARING", "READY", "PICKED_UP"],
    example: "PAID",
  },
  movieId: { type: "integer", example: 1 },
  name: { type: "string", example: "Tên phim" },
  image_path: { type: "string", format: "uri", example: "https://example.com/movie.webp" },
  trailer_url: { type: "string", format: "uri", nullable: true, example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
  language: { type: "string", example: "Tiếng Việt" },
  synopsis: { type: "string", example: "Nội dung phim" },
  rating: { type: "number", format: "float", example: 8.5 },
  duration: { type: "integer", example: 120 },
  top_cast: { type: "string", example: "Diễn viên A, Diễn viên B" },
  release_date: { type: "string", format: "date", example: "2026-08-04" },
  end_date: { type: "string", format: "date", example: "2026-09-04" },
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
  projectionCapability: { type: "string", enum: ["2D", "3D", "BOTH"], example: "BOTH" },
  pricePerSeat: { type: "number", example: 120000 },
  originalMovieId: { type: "integer", example: 1 },
  originalHallId: { type: "integer", example: 1 },
  location: { type: "string", example: "Quận 1" },
  locationDetails: { type: "string", example: "72 Lê Thánh Tôn, Quận 1, TP.HCM" },
  cinemaStatus: { type: "string", enum: ["active", "inactive"], example: "active" },
  seats: {
    type: "array",
    items: {
      type: "object",
      required: ["rowIndex", "columnIndex", "seatType", "priceSurcharge"],
      properties: {
        seatId: { type: "integer", nullable: true },
        rowIndex: { type: "integer", minimum: 1, maximum: 26 },
        columnIndex: { type: "integer", minimum: 1, maximum: 50 },
        seatType: { type: "string", enum: ["STANDARD", "VIP"] },
        priceSurcharge: { type: "integer", minimum: 0 },
      },
    },
  },
  comboId: { type: "integer", example: 1 },
  basePrice: { type: "integer", example: 89000 },
  description: { type: "string", example: "1 bắp rang bơ và 1 nước ngọt" },
  category: { type: "string", example: "Combo bắp nước" },
  imageUrl: { type: "string", format: "uri", nullable: true },
  isActive: { type: "boolean", example: true },
  discountPercent: { type: "number", minimum: 0, maximum: 100, example: 15 },
  promotionLabel: { type: "string", example: "Ưu đãi combo theo phim" },
  startAt: { type: "string", format: "date-time", nullable: true },
  endAt: { type: "string", format: "date-time", nullable: true },
  promotionId: { type: "integer", example: 1 },
  originalEmail: { type: "string", format: "email", example: "staff@cgv.vn" },
  staffEmail: { type: "string", format: "email", example: "staff@cgv.vn" },
  staffPassword: { type: "string", format: "password", minLength: 8 },
  accountStatus: { type: "string", enum: ["active", "inactive"], example: "active" },
  rewardPoints: { type: "integer", minimum: 0, example: 20 },
  grossAmount: { type: "integer", minimum: 1, example: 240000 },
  requestedPoints: { type: "integer", minimum: 0, example: 20 },
  priceOverride: { type: "integer", minimum: 0, nullable: true, example: 99000 },
  isAvailable: { type: "boolean", example: true },
  earnAmountPerPoint: { type: "integer", minimum: 1000, example: 10000 },
  redeemValuePerPoint: { type: "integer", minimum: 100, example: 1000 },
  maximumRedemptionPercent: { type: "integer", minimum: 0, maximum: 100, example: 50 },
  pointExpiryDays: { type: "integer", minimum: 1, nullable: true, example: 365 },
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

const adminCredentials = [];
const paymentSelection = [
  "seatIds",
  "userHallId",
  "userMovieId",
  "userShowtimeId",
  "comboItems",
  "rewardPoints",
];

const endpoints = [
  ["get", "/", "System", "Kiểm tra backend"],
  ["get", "/latestMovies", "Catalog", "Lấy danh sách phim đang chiếu"],
  ["get", "/upcomingMovies", "Catalog", "Lấy phim sắp chiếu và trạng thái mở bán sớm"],
  ["get", "/media/{folder}/{fileName}", "Media", "Đọc ảnh từ Cloudflare R2"],
  ["get", "/locationDetails", "Catalog", "Lấy thông tin địa điểm rạp"],
  ["get", "/locationFeatures", "Catalog", "Lấy tiện ích của rạp"],
  ["get", "/theatres", "Catalog", "Lấy danh sách rạp"],
  ["get", "/genres", "Catalog", "Lấy danh sách thể loại"],
  ["post", "/showtimes", "Catalog", "Tìm lịch chiếu theo rạp và thể loại", ["theatreName", "userGenre"]],
  ["post", "/showtimesDates", "Booking", "Lấy các ngày chiếu của rạp", ["theatreId"]],
  ["post", "/uniqueMovies", "Booking", "Lấy phim theo rạp và ngày", ["theatreId", "userDate"]],
  ["post", "/halls", "Booking", "Lấy phòng và suất chiếu phù hợp", ["theatreId", "userDate", "userMovieId"]],
  ["post", "/seats", "Booking", "Lấy trạng thái ghế", ["userShowtimeId", "userHallId", "userMovieId"]],
  ["post", "/movieCombos", "Booking", "Lấy combo đang bán tại chi nhánh cùng khuyến mãi theo phim", ["movieId", "theatreId"]],
  ["get", "/concessions/catalog", "Concessions", "Lấy danh mục bắp nước và danh sách chi nhánh"],
  ["post", "/concessions/payos/create-payment-link", "Concessions", "Tạo thanh toán PayOS cho đơn bắp nước trong 10 phút", ["theatreId", "items", "rewardPoints"], ["rewardPoints"]],
  ["post", "/concessions/counter-orders/create", "Concessions", "Tạo đơn bắp nước nhận tại quầy trong 30 phút", ["theatreId", "items", "rewardPoints"], ["rewardPoints"]],
  ["post", "/payos/create-payment-link", "Payment", "Tạo liên kết PayOS có hạn thanh toán 10 phút", paymentSelection, ["comboItems", "rewardPoints"]],
  ["post", "/counter-orders/create", "Payment", "Giữ ghế và điểm 30 phút để thanh toán tại rạp", paymentSelection, ["comboItems", "rewardPoints"]],
  ["post", "/payos/confirm-return", "Payment", "Xác nhận kết quả trả về từ PayOS", ["orderCode"]],
  ["post", "/payos/webhook", "Payment", "Nhận webhook PayOS", [], [], { type: "object", additionalProperties: true }],
  ["post", "/registration", "Authentication", "Đăng ký tài khoản", ["email", "firstName", "lastName", "password", "phoneNumber"]],
  ["post", "/login", "Authentication", "Đăng nhập", ["email", "password"]],
  ["get", "/auth/me", "Authentication", "Lấy người dùng từ phiên đăng nhập"],
  ["post", "/logout", "Authentication", "Đăng xuất", []],
  ["post", "/movieDetail", "Catalog", "Lấy chi tiết phim", ["movieDetailsId"]],
  ["post", "/movieWiseShowtime", "Catalog", "Lấy lịch chiếu của phim", ["movieDetailsId", "theatreId"]],
  ["post", "/otherMovies", "Catalog", "Lấy các phim khác", ["movieDetailsId"]],
  ["post", "/customerProfile", "Customer", "Lấy hồ sơ khách hàng", []],
  ["post", "/customerPurchases", "Customer", "Lấy lịch sử mua hàng", []],
  ["post", "/customerRewards", "Rewards", "Lấy số dư, cấu hình và lịch sử điểm thưởng", []],
  ["post", "/rewardQuote", "Rewards", "Báo giá số điểm tối đa và tiền được giảm", ["grossAmount", "requestedPoints"], ["requestedPoints"]],
  ["post", "/adminOrders", "Admin - Orders", "Lấy danh sách đơn hàng", [...adminCredentials, "status"], ["status"]],
  ["post", "/adminOrderStatusUpdate", "Admin - Orders", "Cập nhật trạng thái đơn hàng", [...adminCredentials, "orderCode", "status"]],
  ["post", "/adminOrderFulfillmentUpdate", "Admin - Orders", "Cập nhật trạng thái chuẩn bị và giao bắp nước", ["orderCode", "status"]],
  ["post", "/adminTicketCheckIn", "Admin - Orders", "Check-in toàn bộ vé của đơn", ["orderCode"]],
  ["post", "/adminStaffList", "Admin - Staff", "Admin lấy danh sách tài khoản nhân viên", adminCredentials],
  ["post", "/adminStaffUpsert", "Admin - Staff", "Admin tạo hoặc sửa và khóa nhân viên", [...adminCredentials, "originalEmail", "staffEmail", "firstName", "lastName", "phoneNumber", "staffPassword", "accountStatus"], ["originalEmail", "staffPassword", "accountStatus"]],
  ["post", "/adminCinemaStructure", "Admin - Cinemas", "Lấy toàn bộ chi nhánh, phòng và số ghế", adminCredentials],
  ["post", "/adminTheatreUpsert", "Admin - Cinemas", "Thêm hoặc sửa chi nhánh", [...adminCredentials, "theatreId", "name", "location", "locationDetails", "cinemaStatus"], ["theatreId", "cinemaStatus"]],
  ["post", "/adminTheatreDelete", "Admin - Cinemas", "Xóa chi nhánh chưa có phòng", [...adminCredentials, "theatreId"]],
  ["post", "/adminHallUpsert", "Admin - Cinemas", "Thêm hoặc sửa phòng, hạng phòng và khả năng chiếu", [...adminCredentials, "hallId", "theatreId", "name", "screenType", "projectionCapability", "cinemaStatus"], ["hallId", "cinemaStatus"]],
  ["post", "/adminHallDelete", "Admin - Cinemas", "Xóa phòng chưa có lịch hoặc vé", [...adminCredentials, "hallId"]],
  ["post", "/adminHallLayout", "Admin - Cinemas", "Lấy sơ đồ ghế động của phòng", [...adminCredentials, "hallId"]],
  ["post", "/adminHallLayoutSave", "Admin - Cinemas", "Lưu vị trí, loại và phụ thu từng ghế", [...adminCredentials, "hallId", "seats"]],
  ["post", "/adminComboManagement", "Admin - Combos", "Lấy combo và khuyến mãi theo phim", adminCredentials],
  ["post", "/adminComboUpsert", "Admin - Combos", "Thêm hoặc sửa combo", [...adminCredentials, "comboId", "name", "description", "category", "imageUrl", "basePrice", "isActive"], ["comboId", "imageUrl", "isActive"]],
  ["post", "/adminComboPromotionUpsert", "Admin - Combos", "Gán hoặc sửa khuyến mãi combo theo phim", [...adminCredentials, "movieId", "comboId", "discountPercent", "promotionLabel", "startAt", "endAt", "isActive"], ["promotionLabel", "startAt", "endAt", "isActive"]],
  ["post", "/adminComboPromotionDelete", "Admin - Combos", "Xóa khuyến mãi combo", [...adminCredentials, "promotionId"]],
  ["post", "/adminBranchComboUpsert", "Admin - Combos", "Cấu hình giá và trạng thái combo theo chi nhánh", ["theatreId", "comboId", "priceOverride", "isAvailable"], ["priceOverride", "isAvailable"]],
  ["post", "/adminRewardConfig", "Admin - Rewards", "Lấy cấu hình điểm thưởng", []],
  ["post", "/adminRewardConfigUpdate", "Admin - Rewards", "Cập nhật cấu hình điểm thưởng", ["earnAmountPerPoint", "redeemValuePerPoint", "maximumRedemptionPercent", "pointExpiryDays"], ["pointExpiryDays"]],
  ["post", "/adminMovies", "Admin - Movies", "Lấy danh sách phim quản trị", adminCredentials],
  ["post", "/adminMovieUpdate", "Admin - Movies", "Cập nhật phim", [...adminCredentials, "movieId", "name", "image_path", "trailer_url", "language", "synopsis", "rating", "duration", "top_cast", "release_date", "end_date", "genres", "directors"], ["trailer_url"]],
  ["post", "/adminMovieDelete", "Admin - Movies", "Xoá phim chưa có vé", [...adminCredentials, "movieId"]],
  ["post", "/adminMovieAdd", "Admin - Movies", "Thêm phim cùng thể loại và đạo diễn trong một transaction", [...adminCredentials, "name", "image_path", "trailer_url", "language", "synopsis", "rating", "duration", "top_cast", "release_date", "end_date", "genres", "directors"], ["trailer_url"]],
  ["post", "/adminShowtimeOptions", "Admin - Schedule", "Lấy dữ liệu chọn cho form suất chiếu", adminCredentials],
  ["post", "/adminShowtimeSlots", "Admin - Schedule", "Lấy danh sách suất chiếu quản trị", [...adminCredentials, "selectedShowDate"], ["selectedShowDate"]],
  ["post", "/adminShowtimeCreate", "Admin - Schedule", "Tạo suất chiếu", [...adminCredentials, "movieId", "hallId", "showtimeDate", "movieStartTime", "showType", "screenType", "pricePerSeat"]],
  ["post", "/adminShowtimeUpdate", "Admin - Schedule", "Cập nhật suất chiếu", [...adminCredentials, "originalMovieId", "originalHallId", "showtimeId", "movieId", "hallId", "showtimeDate", "movieStartTime", "showType", "screenType", "pricePerSeat"]],
  ["post", "/adminShowtimeDelete", "Admin - Schedule", "Xoá suất chưa có vé hoặc ngừng bán suất đã có vé; không huỷ vé", [...adminCredentials, "movieId", "hallId", "showtimeId"]],
  ["post", "/adminShowtimeRestore", "Admin - Schedule", "Khôi phục suất chiếu", [...adminCredentials, "movieId", "hallId", "showtimeId"]],
  ["post", "/adminMoviePerformance", "Admin - Analytics", "Thống kê hiệu suất chiếu theo phim", [...adminCredentials, "dateFrom", "dateTo"], ["dateFrom", "dateTo"]],
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
      "Tài liệu API cho hệ thống đặt vé CGV. API bảo vệ sử dụng cookie phiên HttpOnly; danh tính và vai trò luôn được xác minh ở backend.",
  },
  servers: [{ url: "/", description: "Máy chủ hiện tại" }],
  tags: [
    "System",
    "Catalog",
    "Booking",
    "Concessions",
    "Payment",
    "Authentication",
    "Customer",
    "Rewards",
    "Admin - Orders",
    "Admin - Staff",
    "Admin - Movies",
    "Admin - Schedule",
    "Admin - Analytics",
    "Admin - Rewards",
    "Legacy",
  ].map((name) => ({ name })),
  paths: {},
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "cgv_session" },
    },
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

swaggerDocument.paths["/media/{folder}/{fileName}"].get.parameters = [
  {
    name: "folder",
    in: "path",
    required: true,
    schema: { type: "string", enum: ["movies", "combos"] },
  },
  {
    name: "fileName",
    in: "path",
    required: true,
    schema: { type: "string" },
  },
];

swaggerDocument.paths["/concessions/catalog"].get.parameters = [
  {
    name: "theatreId",
    in: "query",
    required: false,
    schema: fieldSchemas.theatreId,
    description: "Chi nhánh nhận bắp nước; bỏ trống để lấy chi nhánh đầu tiên đang hoạt động",
  },
];

swaggerDocument.paths["/adminUploadImage"] = {
  post: {
    tags: ["Admin - Movies", "Admin - Combos"],
    summary: "Tải ảnh phim hoặc sản phẩm lên Cloudflare R2",
    operationId: "post_adminUploadImage",
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            required: ["image"],
            properties: {
              folder: { type: "string", enum: ["movies", "combos"], default: "movies" },
              image: { type: "string", format: "binary" },
            },
          },
        },
      },
    },
    responses: defaultResponses,
    security: [{ cookieAuth: [] }],
  },
};

const protectedPaths = [
  "/auth/me", "/customerProfile", "/customerPurchases", "/customerRewards", "/rewardQuote",
  "/payos/create-payment-link", "/counter-orders/create", "/payos/confirm-return",
  "/concessions/payos/create-payment-link", "/concessions/counter-orders/create",
  ...Object.keys(swaggerDocument.paths).filter((path) => path.startsWith("/admin") || ["/totalTickets", "/totalPayment", "/totalCustomers", "/totalTicketPerMovie"].includes(path)),
];
for (const path of protectedPaths) {
  const operations = swaggerDocument.paths[path];
  if (!operations) continue;
  Object.values(operations).forEach((operation) => { operation.security = [{ cookieAuth: [] }]; });
}

module.exports = swaggerDocument;
