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

  const customerProfile = (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const sql = `SELECT * FROM person where email=? and password=?`;

  db.query(sql, [email, password], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  const customerPurchases = (req, res) => {
  const email = req.body.email;

  const sql = `SELECT
  P.email AS customer_email,
  PA.id AS payment_id,
  PA.method AS payment_method,
  PA.payment_status AS payment_status,
  GROUP_CONCAT(T.id ORDER BY T.id SEPARATOR ', ') AS ticket_ids,
  GROUP_CONCAT(ST.name ORDER BY ST.id SEPARATOR ', ') AS seat_numbers,
  TH.name AS theatre_name,
  H.name AS hall_name,
  M.name AS movie_name,
  T.movie_id as movie_id,
  M.image_path AS movie_image,
  S.movie_start_time AS movie_start_time,
  S.show_type AS show_type,
  S.showtime_date AS showtime_date,
  PA.amount AS ticket_price,
  MIN(T.purchase_date) AS purchase_date
  FROM person P
  JOIN payment PA ON P.email = PA.customer_email
  JOIN ticket T ON PA.id = T.payment_id
  JOIN showtimes S ON T.showtimes_id = S.id
  JOIN movie M ON T.movie_id = M.id
  JOIN hall H ON T.hall_id = H.id
  JOIN theatre TH ON H.theatre_id = TH.id
  JOIN seat ST ON T.seat_id = ST.id
  WHERE P.email = ?
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

    return res.json(data);
  });
};

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
