const createPaymentController = (dependencies) => {
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

  const payment = (req, res) => {
  const amount = req.body.amount;
  const email = req.body.email;
  const paymentType = req.body.userPayMethod;

  const sql1 =
    "INSERT INTO payment(amount,method,customer_email) VALUES(?,?,?)";
  const sql2 = "SELECT LAST_INSERT_ID() as last_id";

  db.query(sql1, [amount, paymentType, email], (err1, data1) => {
    if (err1) return res.json(err1);

    db.query(sql2, (err2, data2) => {
      if (err2) return res.json(err2);

      return res.json(data2);
    });
  });
};

  const purchaseTicket = (req, res) => {
  const price = req.body.price;
  const date = req.body.purchase_date;
  const payment_id = req.body.paymentID;
  const seat_id = req.body.seatId;
  const hall_id = req.body.userHallId;
  const movie_id = req.body.userMovieId;
  const showtime_id = req.body.userShowtimeId;

  const sql = `
    INSERT INTO ticket (price,purchase_date,payment_id,seat_id,hall_id,movie_id,showtimes_id)
    SELECT ?, ?, ?, ?, ?, ?, ?
    FROM shown_in si
    JOIN showtimes s ON si.showtime_id = s.id
    WHERE si.movie_id = ?
      AND si.hall_id = ?
      AND si.showtime_id = ?
      AND si.status = 'active'
      AND s.status = 'active'
      AND NOT EXISTS (
        SELECT 1
        FROM ticket t
        WHERE t.seat_id = ?
          AND t.hall_id = ?
          AND t.movie_id = ?
          AND t.showtimes_id = ?
      )
    LIMIT 1`;

  db.query(
    sql,
    [
      price,
      date,
      payment_id,
      seat_id,
      hall_id,
      movie_id,
      showtime_id,
      movie_id,
      hall_id,
      showtime_id,
      seat_id,
      hall_id,
      movie_id,
      showtime_id,
    ],
    (err, data) => {
      if (err) return res.json(err);
      if (data.affectedRows === 0) {
        return res.status(409).json({
          message: "Suất chiếu đã ngưng bán hoặc ghế đã được đặt",
        });
      }

      return res.json(data);
    }
  );
};

  const recentPurchase = (req, res) => {
  const payment_id = req.body.paymentID;
  const sql = `SELECT id FROM ticket WHERE payment_id=?`;

  db.query(sql, [payment_id], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  const payosCreatePaymentLink = async (req, res) => {
  const { email, seatIds, userHallId, userMovieId, userShowtimeId } = req.body;

  try {
    const orderData = await buildPaymentOrderPayload({
      email,
      seatIds,
      userHallId,
      userMovieId,
      userShowtimeId,
      paymentMethod: "PayOS",
    });
    const payOS = getPayOSClient();
    const orderCode = generatePayOSOrderCode();
    const description = `CGV ${orderCode}`;
    const returnUrl = `${frontendUrl}/purchase?payosOrderCode=${orderCode}`;
    const cancelUrl = `${frontendUrl}/purchase?payosCancel=1&payosOrderCode=${orderCode}`;

    await queryDbAsync(
      `INSERT INTO payos_orders
        (order_code, status, amount, customer_email, payload_json, payment_method)
       VALUES (?, 'PENDING', ?, ?, ?, 'PayOS')`,
      [orderCode, orderData.amount, email, JSON.stringify(orderData.payload)]
    );

    try {
      const paymentLink = await payOS.paymentRequests.create({
        orderCode,
        amount: orderData.amount,
        description,
        buyerEmail: email,
        items: [
          {
            name: `Ve ${orderData.show.movie_name}`.slice(0, 80),
            quantity: orderData.normalizedSeatIds.length,
            price: orderData.seatPrice,
          },
        ],
        cancelUrl,
        returnUrl,
        expiredAt: Math.floor(Date.now() / 1000) + 15 * 60,
      });

      await queryDbAsync(
        `UPDATE payos_orders
         SET payment_link_id = ?, checkout_url = ?, status = ?
         WHERE order_code = ?`,
        [
          paymentLink.paymentLinkId,
          paymentLink.checkoutUrl,
          paymentLink.status || "PENDING",
          orderCode,
        ]
      );

      return res.json({ orderCode, checkoutUrl: paymentLink.checkoutUrl });
    } catch (err) {
      await queryDbAsync(
        "UPDATE payos_orders SET status = 'FAILED', error_message = ? WHERE order_code = ?",
        [err.desc || err.message, orderCode]
      ).catch(() => {});
      throw err;
    }
  } catch (err) {
    console.error("PayOS create payment link error:", err);
    return res.status(err.statusCode || 502).json({
      message:
        err.desc ||
        err.message ||
        "Không thể tạo link thanh toán PayOS",
      payosCode: err.code,
    });
  }
};

  const counterOrdersCreate = async (req, res) => {
  const { email, seatIds, userHallId, userMovieId, userShowtimeId } = req.body;

  try {
    const orderData = await buildPaymentOrderPayload({
      email,
      seatIds,
      userHallId,
      userMovieId,
      userShowtimeId,
      paymentMethod: "Thanh toán tại rạp",
    });
    const orderCode = generatePayOSOrderCode();

    await queryDbAsync(
      `INSERT INTO payos_orders
        (order_code, status, amount, customer_email, payload_json, payment_method)
       VALUES (?, 'UNPAID', ?, ?, ?, 'Thanh toán tại rạp')`,
      [orderCode, orderData.amount, email, JSON.stringify(orderData.payload)]
    );

    const tickets = await finalizePaymentOrderTickets(orderCode, {
      orderStatus: "UNPAID",
      paymentStatus: "UNPAID",
    });

    return res.status(201).json({
      orderCode,
      status: "UNPAID",
      tickets,
      message: "Đã tạo vé thanh toán tại rạp",
    });
  } catch (err) {
    console.error("Counter order create error:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Không thể tạo vé thanh toán tại rạp",
    });
  }
};

  const payosConfirmReturn = async (req, res) => {
  const orderCode = Number(req.body.orderCode);

  if (!orderCode) {
    return res.status(400).json({ message: "Thiếu mã đơn PayOS" });
  }

  try {
    const payOS = getPayOSClient();
    const paymentLink = await payOS.paymentRequests.get(orderCode);

    await queryDbAsync(
      "UPDATE payos_orders SET status = ? WHERE order_code = ? AND status <> 'PAID'",
      [paymentLink.status, orderCode]
    );

    if (paymentLink.status !== "PAID") {
      return res.status(409).json({
        message: "Thanh toán PayOS chưa hoàn tất",
        status: paymentLink.status,
      });
    }

    const tickets = await finalizePaymentOrderTickets(orderCode);
    return res.json({ tickets });
  } catch (err) {
    console.error("PayOS confirm return error:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Không thể xác nhận thanh toán PayOS",
    });
  }
};

  const payosWebhook = async (req, res) => {
  try {
    const payOS = getPayOSClient();
    const webhookData = await payOS.webhooks.verify(req.body);
    const orderCode = Number(webhookData.orderCode);

    if (!orderCode) return res.status(200).json({ ok: true });

    if (webhookData.code === "00") {
      await finalizePaymentOrderTickets(orderCode);
    } else {
      await queryDbAsync(
        "UPDATE payos_orders SET status = 'FAILED', error_message = ? WHERE order_code = ? AND status <> 'PAID'",
        [webhookData.desc || "PayOS webhook failed", orderCode]
      );
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("PayOS webhook error:", err);
    return res.status(400).json({ message: "Invalid PayOS webhook" });
  }
};

  return {
    payment,
    purchaseTicket,
    recentPurchase,
    payosCreatePaymentLink,
    counterOrdersCreate,
    payosConfirmReturn,
    payosWebhook,
  };
};

module.exports = createPaymentController;
