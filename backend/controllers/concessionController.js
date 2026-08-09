// Điều phối trang mua bắp nước và hai hình thức thanh toán.
const createConcessionController = (dependencies) => {
  const {
    queryDbAsync,
    getConcessionCatalog,
    buildConcessionOrderPayload,
    getPayOSClient,
    generatePayOSOrderCode,
    frontendUrl,
    ONLINE_PAYMENT_WINDOW_MINUTES,
    COUNTER_HOLD_WINDOW_MINUTES,
    reserveRewardPoints,
    releaseRewardHold,
  } = dependencies;

  const catalog = async (req, res) => {
    try {
      return res.json(await getConcessionCatalog(req.query.theatreId));
    } catch (err) {
      return res.status(err.statusCode || 500).json({ message: err.message || "Không thể tải bắp nước" });
    }
  };

  const createPayOSOrder = async (req, res) => {
    let orderCode;
    try {
      const orderData = await buildConcessionOrderPayload({
        email: req.body.email,
        theatreId: req.body.theatreId,
        items: req.body.items,
        paymentMethod: "PayOS",
      });
      orderCode = generatePayOSOrderCode();
      const reward = await reserveRewardPoints({
        email: req.body.email,
        password: req.body.customerPassword,
        orderCode,
        grossAmount: orderData.amount,
        requestedPoints: req.body.rewardPoints,
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
      await queryDbAsync(
        `INSERT INTO payos_orders
          (order_code, status, amount, customer_email, payload_json, payment_method, expires_at)
         VALUES (?, 'PENDING', ?, ?, ?, 'PayOS', DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
        [orderCode, orderData.amount, req.body.email, JSON.stringify(orderData.payload)]
      );

      try {
        const paymentLink = await getPayOSClient().paymentRequests.create({
          orderCode,
          amount: orderData.amount,
          description: `CGV FOOD ${orderCode}`.slice(0, 25),
          buyerEmail: req.body.email,
          items: reward.pointsUsed > 0 ? [{
            name: "Don bap nuoc sau giam diem",
            quantity: 1,
            price: orderData.amount,
          }] : orderData.payload.comboItems.map((item) => ({
            name: item.name.slice(0, 80),
            quantity: item.quantity,
            price: item.finalUnitPrice,
          })),
          cancelUrl: `${frontendUrl}/bap-nuoc?payosCancel=1&payosOrderCode=${orderCode}`,
          returnUrl: `${frontendUrl}/bap-nuoc?payosOrderCode=${orderCode}`,
          expiredAt: Math.floor(Date.now() / 1000) + ONLINE_PAYMENT_WINDOW_MINUTES * 60,
        });
        await queryDbAsync(
          `UPDATE payos_orders SET payment_link_id = ?, checkout_url = ?, status = ?
           WHERE order_code = ?`,
          [paymentLink.paymentLinkId, paymentLink.checkoutUrl, paymentLink.status || "PENDING", orderCode]
        );
        return res.status(201).json({
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
        throw err;
      }
    } catch (err) {
      if (orderCode) await releaseRewardHold(orderCode).catch(() => {});
      console.error("Concession PayOS create error:", err);
      return res.status(err.statusCode || 502).json({ message: err.desc || err.message || "Không thể tạo thanh toán" });
    }
  };

  const createCounterOrder = async (req, res) => {
    let orderCode;
    try {
      const orderData = await buildConcessionOrderPayload({
        email: req.body.email,
        theatreId: req.body.theatreId,
        items: req.body.items,
        paymentMethod: "Thanh toán tại rạp",
      });
      orderCode = generatePayOSOrderCode();
      const reward = await reserveRewardPoints({
        email: req.body.email,
        password: req.body.customerPassword,
        orderCode,
        grossAmount: orderData.amount,
        requestedPoints: req.body.rewardPoints,
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
        [orderCode, orderData.amount, req.body.email, JSON.stringify(orderData.payload)]
      );
      const [created] = await queryDbAsync(
        "SELECT expires_at FROM payos_orders WHERE order_code = ?",
        [orderCode]
      );
      return res.status(201).json({
        orderCode,
        status: "UNPAID",
        expiresAt: created?.expires_at || null,
        holdMinutes: COUNTER_HOLD_WINDOW_MINUTES,
        reward,
        message: "Đã tạo đơn. Vui lòng thanh toán và nhận bắp nước tại quầy trong 30 phút.",
      });
    } catch (err) {
      if (orderCode) {
        await queryDbAsync(
          "UPDATE payos_orders SET status = 'FAILED', error_message = ? WHERE order_code = ? AND status <> 'PAID'",
          [err.message || "Không thể tạo đơn tại quầy", orderCode]
        ).catch(() => {});
        await releaseRewardHold(orderCode).catch(() => {});
      }
      return res.status(err.statusCode || 500).json({ message: err.message || "Không thể tạo đơn tại quầy" });
    }
  };

  return { catalog, createPayOSOrder, createCounterOrder };
};

module.exports = createConcessionController;
