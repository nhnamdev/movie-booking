const createAdminService = ({ db, parsePayOSOrderPayload, normalizeSeatIds }) => {
  const verifyAdmin = (email, password, callback) => {
    const sql = `SELECT email from person WHERE email = ? and password = ? and person_type = ?`;
  
    db.query(sql, [email, password, "Admin"], (err, data) => {
      if (err) return callback(err);
      return callback(null, data.length > 0);
    });
  };

  const adminAuthFailed = (res) =>
    res.status(403).json({ message: "Xin lỗi, bạn không phải là Admin!" });

  const queryDb = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

  const requireAdmin = (email, password) =>
    new Promise((resolve, reject) => {
      verifyAdmin(email, password, (err, isAdmin) => {
        if (err) return reject(err);
        return resolve(isAdmin);
      });
    });

  const normalizeAdminList = (value) => {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const toAdminOrder = (order) => {
    const payload = parsePayOSOrderPayload(order.payload_json) || {};
    const ticketIds = parsePayOSOrderPayload(order.ticket_ids_json) || [];
  
    return {
      id: order.id,
      order_code: order.order_code,
      status: order.status,
      amount: order.amount,
      customer_email: order.customer_email,
      payment_method: order.payment_method || payload.paymentMethod || "PayOS",
      payment_status: order.payment_status || order.status,
      payment_id: order.payment_id,
      ticket_ids: ticketIds,
      seats: normalizeSeatIds(payload.seatIds),
      movie_name: payload.movieName || "",
      hall_name: payload.hallName || "",
      showtime_date: payload.showtimeDate || "",
      movie_start_time: payload.movieStartTime || "",
      error_message: order.error_message,
      checkout_url: order.checkout_url,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  };

  return {
    verifyAdmin,
    adminAuthFailed,
    queryDb,
    requireAdmin,
    normalizeAdminList,
    toAdminOrder,
  };
};

module.exports = createAdminService;
