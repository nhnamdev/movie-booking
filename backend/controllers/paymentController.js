// Điều phối thanh toán và phát hành vé.
const createPaymentController = (dependencies) => {
  const {
    queryDbAsync,
    getPayOSClient,
    parsePayOSOrderPayload,
    generatePayOSOrderCode,
    buildPaymentOrderPayload,
    reserveSeatHolds,
    releaseSeatHolds,
    finalizePaymentOrderTickets,
    expireStaleOrders,
    ONLINE_PAYMENT_WINDOW_MINUTES,
    COUNTER_HOLD_WINDOW_MINUTES,
    reserveRewardPoints,
    releaseRewardHold,
    frontendUrl,
  } = dependencies;

  // Tạo đơn và liên kết thanh toán PayOS cho các ghế đã chọn.
  const payosCreatePaymentLink = async (req, res) => {
  const { email, customerPassword, seatIds, userHallId, userMovieId, userShowtimeId, comboItems, rewardPoints } = req.body;
  let orderCode;

  try {
    const orderData = await buildPaymentOrderPayload({
      email,
      seatIds,
      userHallId,
      userMovieId,
      userShowtimeId,
      paymentMethod: "PayOS",
      comboItems,
    });
    const payOS = getPayOSClient();
    orderCode = generatePayOSOrderCode();
    const reward = await reserveRewardPoints({
      email,
      password: customerPassword,
      orderCode,
      grossAmount: orderData.amount,
      requestedPoints: rewardPoints,
      holdMinutes: ONLINE_PAYMENT_WINDOW_MINUTES,
    });
    orderData.payload = {
      ...orderData.payload,
      grossAmount: reward.grossAmount,
      rewardPointsUsed: reward.pointsUsed,
      rewardDiscount: reward.discountAmount,
      amount: reward.payableAmount,
    };
    orderData.amount = reward.payableAmount;
    const description = `CGV ${orderCode}`;
    const returnUrl = `${frontendUrl}/purchase?payosOrderCode=${orderCode}`;
    const cancelUrl = `${frontendUrl}/purchase?payosCancel=1&payosOrderCode=${orderCode}`;

    await queryDbAsync(
      `INSERT INTO payos_orders
        (order_code, status, amount, customer_email, payload_json, payment_method, expires_at)
       VALUES (?, 'PENDING', ?, ?, ?, 'PayOS', DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
      [orderCode, orderData.amount, email, JSON.stringify(orderData.payload)]
    );
    await reserveSeatHolds({
      orderCode,
      email,
      payload: orderData.payload,
      holdMinutes: ONLINE_PAYMENT_WINDOW_MINUTES,
    });

    try {
      const ticketItemGroups = Object.values(
        (orderData.payload.seatPrices || []).reduce((groups, seat) => {
          const key = `${seat.seatType}-${seat.finalPrice}`;
          if (!groups[key]) {
            groups[key] = {
              name: `Ve ${seat.seatType === "VIP" ? "VIP" : "thuong"} ${orderData.show.movie_name}`.slice(0, 80),
              quantity: 0,
              price: seat.finalPrice,
            };
          }
          groups[key].quantity += 1;
          return groups;
        }, {})
      );
      const paymentLink = await payOS.paymentRequests.create({
        orderCode,
        amount: orderData.amount,
        description,
        buyerEmail: email,
        items: reward.pointsUsed > 0 ? [{
          name: `Don CGV sau giam diem`.slice(0, 80),
          quantity: 1,
          price: orderData.amount,
        }] : [
          ...(ticketItemGroups.length > 0
            ? ticketItemGroups
            : [{
                name: `Ve ${orderData.show.movie_name}`.slice(0, 80),
                quantity: orderData.normalizedSeatIds.length,
                price: orderData.seatPrice,
              }]),
          ...orderData.payload.comboItems.map((combo) => ({
            name: combo.name.slice(0, 80),
            quantity: combo.quantity,
            price: combo.finalUnitPrice,
          })),
        ],
        cancelUrl,
        returnUrl,
        expiredAt:
          Math.floor(Date.now() / 1000) + ONLINE_PAYMENT_WINDOW_MINUTES * 60,
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

      return res.json({
        orderCode,
        checkoutUrl: paymentLink.checkoutUrl,
        paymentWindowMinutes: ONLINE_PAYMENT_WINDOW_MINUTES,
        reward,
      });
    } catch (err) {
      await queryDbAsync(
        "UPDATE payos_orders SET status = 'FAILED', error_message = ? WHERE order_code = ?",
        [err.desc || err.message, orderCode]
      ).catch(() => {});
      await releaseRewardHold(orderCode).catch(() => {});
      await releaseSeatHolds(orderCode).catch(() => {});
      throw err;
    }
  } catch (err) {
    if (orderCode) {
      await releaseRewardHold(orderCode).catch(() => {});
      await releaseSeatHolds(orderCode).catch(() => {});
    }
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

  // Giữ ghế tạm thời cho hình thức trả tiền tại rạp, chưa phát hành vé.
  const counterOrdersCreate = async (req, res) => {
  const { email, customerPassword, seatIds, userHallId, userMovieId, userShowtimeId, comboItems, rewardPoints } = req.body;
  let orderCode;

  try {
    const orderData = await buildPaymentOrderPayload({
      email,
      seatIds,
      userHallId,
      userMovieId,
      userShowtimeId,
      paymentMethod: "Thanh toán tại rạp",
      comboItems,
    });
    orderCode = generatePayOSOrderCode();
    const reward = await reserveRewardPoints({
      email,
      password: customerPassword,
      orderCode,
      grossAmount: orderData.amount,
      requestedPoints: rewardPoints,
      holdMinutes: COUNTER_HOLD_WINDOW_MINUTES,
    });
    orderData.payload = {
      ...orderData.payload,
      grossAmount: reward.grossAmount,
      rewardPointsUsed: reward.pointsUsed,
      rewardDiscount: reward.discountAmount,
      amount: reward.payableAmount,
    };
    orderData.amount = reward.payableAmount;

    await queryDbAsync(
      `INSERT INTO payos_orders
        (order_code, status, amount, customer_email, payload_json, payment_method, expires_at)
       VALUES (?, 'UNPAID', ?, ?, ?, 'Thanh toán tại rạp', DATE_ADD(NOW(), INTERVAL 30 MINUTE))`,
      [orderCode, orderData.amount, email, JSON.stringify(orderData.payload)]
    );
    await reserveSeatHolds({
      orderCode,
      email,
      payload: orderData.payload,
      holdMinutes: COUNTER_HOLD_WINDOW_MINUTES,
    });

    const [createdOrder] = await queryDbAsync(
      "SELECT expires_at FROM payos_orders WHERE order_code = ?",
      [orderCode]
    );

    return res.status(201).json({
      orderCode,
      status: "UNPAID",
      tickets: [],
      expiresAt: createdOrder?.expires_at || null,
      holdMinutes: COUNTER_HOLD_WINDOW_MINUTES,
      reward,
      message: "Đã giữ ghế để thanh toán tại rạp trong 30 phút",
    });
  } catch (err) {
    if (orderCode) {
      await queryDbAsync(
        "UPDATE payos_orders SET status = 'FAILED', error_message = ? WHERE order_code = ? AND status <> 'PAID'",
        [err.message || "Không thể tạo đơn tại rạp", orderCode]
      ).catch(() => {});
      await releaseRewardHold(orderCode).catch(() => {});
      await releaseSeatHolds(orderCode).catch(() => {});
    }
    console.error("Counter order create error:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Không thể giữ ghế để thanh toán tại rạp",
    });
  }
};

  // Đối soát trạng thái PayOS khi khách quay lại website.
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
      await expireStaleOrders();
      return res.status(409).json({
        message:
          paymentLink.status === "EXPIRED"
            ? "Đơn PayOS đã hết hạn thanh toán"
            : "Thanh toán PayOS chưa hoàn tất",
        status: paymentLink.status,
      });
    }

    const tickets = await finalizePaymentOrderTickets(orderCode);
    return res.json({ tickets });
  } catch (err) {
    if (err.code === "ORDER_EXPIRED" && orderCode) {
      await queryDbAsync(
        `UPDATE payos_orders SET status = 'PAID_REVIEW',
          error_message = 'PayOS báo đã thanh toán sau khi hết thời gian giữ ghế. Cần đối soát thủ công.'
         WHERE order_code = ?`,
        [orderCode]
      ).catch(() => {});
    }
    console.error("PayOS confirm return error:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Không thể xác nhận thanh toán PayOS",
    });
  }
};

  // Xác thực webhook PayOS và hoàn tất hoặc đánh dấu đơn lỗi.
  const payosWebhook = async (req, res) => {
  try {
    const payOS = getPayOSClient();
    const webhookData = await payOS.webhooks.verify(req.body);
    const orderCode = Number(webhookData.orderCode);

    if (!orderCode) return res.status(200).json({ ok: true });

    if (webhookData.code === "00") {
      try {
        await finalizePaymentOrderTickets(orderCode);
      } catch (err) {
        if (err.code !== "ORDER_EXPIRED") throw err;
        await queryDbAsync(
          `UPDATE payos_orders SET status = 'PAID_REVIEW',
            error_message = 'PayOS báo đã thanh toán sau khi hết thời gian giữ ghế. Cần đối soát thủ công.'
           WHERE order_code = ?`,
          [orderCode]
        );
      }
    } else {
      await queryDbAsync(
        "UPDATE payos_orders SET status = 'FAILED', error_message = ? WHERE order_code = ? AND status NOT IN ('PAID', 'EXPIRED')",
        [webhookData.desc || "PayOS webhook failed", orderCode]
      );
      await releaseRewardHold(orderCode);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("PayOS webhook error:", err);
    return res.status(400).json({ message: "Invalid PayOS webhook" });
  }
};

  return {
    payosCreatePaymentLink,
    counterOrdersCreate,
    payosConfirmReturn,
    payosWebhook,
  };
};

module.exports = createPaymentController;
