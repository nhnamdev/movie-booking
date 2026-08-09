// Xử lý hồ sơ và lịch sử mua vé của khách hàng.
const createCustomerController = (dependencies) => {
  const {
    db,
    queryDbAsync,
    getPayOSClient,
    parsePayOSOrderPayload,
    generatePayOSOrderCode,
    normalizeSeatIds,
    getHeldOrderSeatIds,
    buildPaymentOrderPayload,
    finalizePaymentOrderTickets,
    frontendUrl,
    maskEmail,
    logRegisterDebug,
    verifyAdmin,
    adminAuthFailed,
    queryDb,
    requireAdmin,
    normalizeAdminList,
    toAdminOrder,
    uploadToR2,
    generateFileName,
  } = dependencies;

  // Lấy hồ sơ khách hàng sau khi xác thực thông tin đăng nhập.
  const customerProfile = (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const sql = `SELECT * FROM person where email=? and password=?`;

  db.query(sql, [email, password], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  // Lấy lịch sử thanh toán và vé đã mua theo email.
  const customerPurchases = (req, res) => {
  const email = req.body.email;

  const sql = `SELECT
  P.email AS customer_email,
  PA.id AS payment_id,
  PA.method AS payment_method,
  PA.payment_status AS payment_status,
  GROUP_CONCAT(T.id ORDER BY T.id SEPARATOR ', ') AS ticket_ids,
  GROUP_CONCAT(COALESCE(HS.seat_label, ST.name) ORDER BY HS.row_index, HS.column_index SEPARATOR ', ') AS seat_numbers,
  TH.name AS theatre_name,
  H.name AS hall_name,
  M.name AS movie_name,
  T.movie_id as movie_id,
  M.image_path AS movie_image,
  S.movie_start_time AS movie_start_time,
  S.show_type AS show_type,
  S.showtime_date AS showtime_date,
  PA.amount AS ticket_price,
  MAX(PO.payload_json) AS order_payload_json,
  MIN(T.purchase_date) AS purchase_date
  FROM person P
  JOIN payment PA ON P.email = PA.customer_email
  JOIN ticket T ON PA.id = T.payment_id
  JOIN showtimes S ON T.showtimes_id = S.id
  JOIN movie M ON T.movie_id = M.id
  JOIN hall H ON T.hall_id = H.id
  JOIN theatre TH ON H.theatre_id = TH.id
  JOIN seat ST ON T.seat_id = ST.id
  JOIN hallwise_seat HS ON HS.hall_id = T.hall_id AND HS.seat_id = T.seat_id
  LEFT JOIN payos_orders PO ON PO.payment_id = PA.id
  WHERE P.email = ?
    AND PA.payment_status <> 'EXPIRED'
  GROUP BY
    P.email,
    PA.id,
    PA.method,
    PA.payment_status,
    TH.name,
    H.name,
    M.name,
    T.movie_id,
    M.image_path,
    S.movie_start_time,
    S.show_type,
    S.showtime_date,
    PA.amount
  ORDER BY payment_id DESC`;

  db.query(sql, [email], (err, data) => {
    if (err) {
      console.error("Customer purchases load error:", err);
      return res.status(500).json({ message: "Không thể tải lịch sử mua vé" });
    }

    return res.json(
      data.map((purchase) => {
        const orderPayload = parsePayOSOrderPayload(purchase.order_payload_json) || {};
        return {
          ...purchase,
          ticket_subtotal: Number(orderPayload.ticketSubtotal ?? purchase.ticket_price ?? 0),
          combo_items: Array.isArray(orderPayload.comboItems) ? orderPayload.comboItems : [],
          combo_subtotal: Number(orderPayload.comboSubtotal || 0),
          combo_discount: Number(orderPayload.comboDiscount || 0),
          combo_total: Number(orderPayload.comboTotal || 0),
          gross_amount: Number(orderPayload.grossAmount ?? purchase.amount ?? 0),
          reward_points_used: Number(orderPayload.rewardPointsUsed || 0),
          reward_discount: Number(orderPayload.rewardDiscount || 0),
          total_amount: Number(purchase.amount || 0),
          order_payload_json: undefined,
        };
      })
    );
  });
};

  // Xoá một vé khỏi lịch sử đặt theo mã vé.
  const cancelOneTicket = (req, res) => {
  const ticketId = req.body.ticketId;
  const sql = "DELETE FROM ticket WHERE id = ?";
  db.query(sql, [ticketId], (err, result) => {
    if (err) return res.json({ success: false });
    return res.json({ success: true });
  });
};

  return {
    customerProfile,
    customerPurchases,
    cancelOneTicket,
  };
};

module.exports = createCustomerController;
