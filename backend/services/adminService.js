// Cung cấp các tiện ích xác thực và chuẩn hoá dữ liệu quản trị.
const { AUTHENTICATED_REQUEST } = require("../middleware/authContext");

const createAdminService = ({ db, parsePayOSOrderPayload, normalizeSeatIds }) => {
  // Kiểm tra thông tin đăng nhập có thuộc tài khoản admin hay không.
  const verifyAdmin = (email, password, callback) => {
    const sessionAuthenticated = password === AUTHENTICATED_REQUEST;
    const sql = `SELECT email from person
      WHERE email = ? ${sessionAuthenticated ? "" : "and password = ?"}
        and person_type = ? and account_status = 'active'`;
    const params = sessionAuthenticated ? [email, "Admin"] : [email, password, "Admin"];
  
    db.query(sql, params, (err, data) => {
      if (err) return callback(err);
      return callback(null, data.length > 0);
    });
  };

  // Trả phản hồi khi người dùng không có quyền admin.
  const adminAuthFailed = (res) =>
    res.status(403).json({ message: "Xin lỗi, bạn không phải là Admin!" });

  const roleAuthFailed = (res) =>
    res.status(403).json({ message: "Tài khoản không có quyền thực hiện chức năng này" });

  // Chuyển truy vấn callback sang Promise cho luồng async/await.
  const queryDb = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

  // Xác thực admin dưới dạng Promise.
  const requireAdmin = (email, password) =>
    new Promise((resolve, reject) => {
      verifyAdmin(email, password, (err, isAdmin) => {
        if (err) return reject(err);
        return resolve(isAdmin);
      });
    });

  // Xác thực tài khoản đang hoạt động và thuộc một trong các vai trò cho phép.
  const requireRole = async (email, password, allowedRoles = []) => {
    if (!email || !password || !Array.isArray(allowedRoles) || allowedRoles.length === 0) {
      return false;
    }
    const placeholders = allowedRoles.map(() => "?").join(",");
    const sessionAuthenticated = password === AUTHENTICATED_REQUEST;
    const rows = await queryDb(
      `SELECT email, person_type FROM person
       WHERE email = ? ${sessionAuthenticated ? "" : "AND password = ?"}
         AND account_status = 'active'
         AND person_type IN (${placeholders})
       LIMIT 1`,
      sessionAuthenticated
        ? [email, ...allowedRoles]
        : [email, password, ...allowedRoles]
    );
    return rows.length > 0;
  };

  // Chuẩn hoá chuỗi hoặc mảng thành danh sách giá trị hợp lệ.
  const normalizeAdminList = (value) => {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  // Chuyển bản ghi đơn hàng thành dữ liệu dùng cho trang quản trị.
  const toAdminOrder = (order) => {
    const payload = parsePayOSOrderPayload(order.payload_json) || {};
    const ticketIds = parsePayOSOrderPayload(order.ticket_ids_json) || [];
    const comboItems = Array.isArray(payload.comboItems) ? payload.comboItems : [];
  
    return {
      id: order.id,
      order_code: order.order_code,
      status: order.status,
      amount: order.amount,
      customer_email: order.customer_email,
      payment_method: order.payment_method || payload.paymentMethod || "PayOS",
      payment_status: order.payment_status || order.status,
      fulfillment_status: order.fulfillment_status || "PENDING",
      fulfilled_at: order.fulfilled_at,
      fulfilled_by: order.fulfilled_by,
      ticket_checked_in_at: order.ticket_checked_in_at,
      ticket_checked_in_by: order.ticket_checked_in_by,
      payment_id: order.payment_id,
      ticket_ids: ticketIds,
      seats: normalizeSeatIds(payload.seatIds),
      seat_names: Array.isArray(payload.seatPrices)
        ? payload.seatPrices.map((seat) => seat.seatName).filter(Boolean)
        : [],
      combo_items: comboItems,
      order_type: payload.orderType || "TICKET",
      theatre_name: payload.theatreName || "",
      theatre_address: payload.theatreAddress || "",
      ticket_subtotal: Number(payload.ticketSubtotal ?? order.amount ?? 0),
      combo_subtotal: Number(payload.comboSubtotal || 0),
      combo_discount: Number(payload.comboDiscount || 0),
      combo_total: Number(payload.comboTotal || 0),
      gross_amount: Number(payload.grossAmount ?? order.amount ?? 0),
      reward_points_used: Number(payload.rewardPointsUsed || 0),
      reward_discount: Number(payload.rewardDiscount || 0),
      movie_name: payload.movieName || "",
      hall_name: payload.hallName || "",
      showtime_date: payload.showtimeDate || "",
      movie_start_time: payload.movieStartTime || "",
      error_message: order.error_message,
      checkout_url: order.checkout_url,
      expires_at: order.expires_at,
      remaining_seconds: order.expires_at
        ? Math.max(0, Math.floor((new Date(order.expires_at).getTime() - Date.now()) / 1000))
        : null,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  };

  return {
    verifyAdmin,
    adminAuthFailed,
    roleAuthFailed,
    queryDb,
    requireAdmin,
    requireRole,
    normalizeAdminList,
    toAdminOrder,
  };
};

module.exports = createAdminService;
