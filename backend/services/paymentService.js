const { PayOS } = require("@payos/node");

const ONLINE_PAYMENT_WINDOW_MINUTES = 10;
const COUNTER_HOLD_WINDOW_MINUTES = 30;

// Xử lý nghiệp vụ giữ ghế, đơn PayOS và phát hành vé.
const createPaymentService = ({
  queryDbAsync,
  withTransaction,
  priceComboSelection,
  settlePaidOrderRewards,
  releaseRewardHold,
  releaseExpiredRewardHolds,
  assertShowtimeBookable,
}) => {
  // Khởi tạo PayOS client từ cấu hình môi trường bắt buộc.
  const getPayOSClient = () => {
    if (
      !process.env.PAYOS_CLIENT_ID ||
      !process.env.PAYOS_API_KEY ||
      !process.env.PAYOS_CHECKSUM_KEY
    ) {
      throw new Error("PayOS configuration is missing.");
    }
  
    return new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });
  };

  // Tạo ngày hiện tại theo định dạng dùng trong cơ sở dữ liệu.
  const getTodayDateKey = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Đọc JSON của đơn PayOS an toàn, trả null nếu sai định dạng.
  const parsePayOSOrderPayload = (payloadJson) => {
    try {
      return JSON.parse(payloadJson);
    } catch {
      return null;
    }
  };

  // Sinh mã đơn số nguyên dựa trên thời gian hiện tại.
  const generatePayOSOrderCode = () =>
    Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000);

  // Chuẩn hoá và loại bỏ mã ghế trùng hoặc không hợp lệ.
  const normalizeSeatIds = (seatIds) =>
    Array.isArray(seatIds)
      ? [...new Set(seatIds.map((seatId) => Number(seatId)).filter(Number.isInteger))]
      : [];

  const orderHasExpired = (order) => {
    if (!order) return false;
    if (String(order.status || "").toUpperCase() === "EXPIRED") return true;
    if (!order.expires_at) return false;
    const expiresAt = new Date(order.expires_at).getTime();
    return Number.isFinite(expiresAt) && expiresAt <= Date.now();
  };

  const markOrderExpired = async (orderCode) => {
    await queryDbAsync(
      `UPDATE payos_orders
       SET status = 'EXPIRED', error_message = 'Đơn đã hết thời gian giữ ghế'
       WHERE order_code = ? AND status IN ('UNPAID', 'PENDING')`,
      [orderCode]
    );
    await queryDbAsync(
      `UPDATE payment P
       JOIN payos_orders PO ON PO.payment_id = P.id
       SET P.payment_status = 'EXPIRED'
       WHERE PO.order_code = ? AND P.payment_status <> 'PAID'`,
      [orderCode]
    );
    await releaseRewardHold?.(orderCode);
  };

  const expireStaleOrders = async () => {
    await queryDbAsync(
      `UPDATE payment P
       JOIN payos_orders PO ON PO.payment_id = P.id
       SET P.payment_status = 'EXPIRED'
       WHERE (
           PO.status = 'EXPIRED'
           OR (
             PO.status IN ('UNPAID', 'PENDING')
             AND PO.expires_at IS NOT NULL
             AND PO.expires_at <= NOW()
           )
         )
         AND P.payment_status <> 'PAID'`
    );
    const result = await queryDbAsync(
      `UPDATE payos_orders
       SET status = 'EXPIRED', error_message = 'Đơn đã hết thời gian giữ ghế'
       WHERE status IN ('UNPAID', 'PENDING')
         AND expires_at IS NOT NULL
         AND expires_at <= NOW()`
    );
    await releaseExpiredRewardHolds?.();
    return result;
  };

  const startExpirationScheduler = () => {
    expireStaleOrders().catch((err) =>
      console.error("Expire stale payment orders error:", err.message)
    );
    const timer = setInterval(() => {
      expireStaleOrders().catch((err) =>
        console.error("Expire stale payment orders error:", err.message)
      );
    }, 60 * 1000);
    timer.unref?.();
    return timer;
  };

  // Tìm các ghế đang được giữ bởi đơn chưa thanh toán còn hiệu lực.
  const getHeldOrderSeatIds = async ({ hallId, movieId, showtimeId }) => {
    await expireStaleOrders();
    const rows = await queryDbAsync(
      `SELECT order_code, status, payment_method, payload_json, expires_at
       FROM payos_orders
       WHERE status IN ('UNPAID', 'PENDING')
         AND expires_at > NOW()`
    );
    const heldSeatIds = new Set();
  
    rows.forEach((row) => {
      const payload = parsePayOSOrderPayload(row.payload_json);
      if (
        !payload ||
        Number(payload.userHallId) !== Number(hallId) ||
        Number(payload.userMovieId) !== Number(movieId) ||
        Number(payload.userShowtimeId) !== Number(showtimeId)
      ) {
        return;
      }
  
      normalizeSeatIds(payload.seatIds).forEach((seatId) => heldSeatIds.add(seatId));
    });
  
    return heldSeatIds;
  };

  // Kiểm tra suất, ghế và tính tổng tiền trước khi tạo đơn.
  const buildPaymentOrderPayload = async ({
    email,
    seatIds,
    userHallId,
    userMovieId,
    userShowtimeId,
    paymentMethod,
    comboItems = [],
  }) => {
    const normalizedSeatIds = normalizeSeatIds(seatIds);
    const hallId = Number(userHallId);
    const movieId = Number(userMovieId);
    const showtimeId = Number(userShowtimeId);
  
    if (!email || normalizedSeatIds.length === 0 || !hallId || !movieId || !showtimeId) {
      const err = new Error("Dữ liệu thanh toán không hợp lệ");
      err.statusCode = 400;
      throw err;
    }
  
    const show = await assertShowtimeBookable({ movieId, hallId, showtimeId });
  
    const availableSeats = await queryDbAsync(
      `SELECT S.id,
        COALESCE(HS.seat_label, S.name) AS seat_name,
        HS.seat_type,
        HS.price_surcharge,
        ? + HS.price_surcharge AS final_price
       FROM seat S
       JOIN hallwise_seat HS ON S.id = HS.seat_id
       WHERE HS.hall_id = ?
         AND HS.is_active = 1
         AND S.id IN (?)
         AND NOT EXISTS (
           SELECT 1
           FROM ticket T
           JOIN payment TP ON TP.id = T.payment_id
           WHERE T.seat_id = S.id
             AND T.hall_id = ?
             AND T.movie_id = ?
             AND T.showtimes_id = ?
             AND TP.payment_status <> 'EXPIRED'
         )`,
      [Number(show.price_per_seat), hallId, normalizedSeatIds, hallId, movieId, showtimeId]
    );
  
    const heldSeatIds = await getHeldOrderSeatIds({ hallId, movieId, showtimeId });
    const selectedHeldSeatIds = normalizedSeatIds.filter((seatId) => heldSeatIds.has(seatId));
  
    if (
      availableSeats.length !== normalizedSeatIds.length ||
      selectedHeldSeatIds.length > 0
    ) {
      const err = new Error("Một hoặc nhiều ghế đã được đặt");
      err.statusCode = 409;
      throw err;
    }
  
    const seatPrice = Number(show.price_per_seat);
    const availableSeatById = new Map(
      availableSeats.map((seat) => [Number(seat.id), seat])
    );
    const seatPrices = normalizedSeatIds.map((seatId) => {
      const seat = availableSeatById.get(seatId);
      return {
        seatId,
        seatName: seat.seat_name,
        seatType: seat.seat_type || "STANDARD",
        basePrice: seatPrice,
        priceSurcharge: Number(seat.price_surcharge || 0),
        finalPrice: Number(seat.final_price),
      };
    });
    const ticketSubtotal = seatPrices.reduce((sum, seat) => sum + seat.finalPrice, 0);
    const comboPricing = await priceComboSelection(movieId, comboItems);
    const amount = ticketSubtotal + comboPricing.total;
  
    return {
      amount,
      normalizedSeatIds,
      seatPrice,
      show,
      payload: {
        email,
        seatIds: normalizedSeatIds,
        userHallId: hallId,
        userMovieId: movieId,
        userShowtimeId: showtimeId,
        seatPrice,
        seatPrices,
        ticketSubtotal,
        comboItems: comboPricing.items,
        comboSubtotal: comboPricing.subtotal,
        comboDiscount: comboPricing.discount,
        comboTotal: comboPricing.total,
        amount,
        paymentMethod,
        movieName: show.movie_name,
        hallName: show.hall_name,
        showtimeDate: show.showtime_date,
        movieStartTime: show.movie_start_time,
      },
    };
  };

  // Chỉ chèn vé khi suất còn mở và ghế chưa được bán.
  const ticketInsertSql = `
    INSERT INTO ticket (price,purchase_date,payment_id,seat_id,hall_id,movie_id,showtimes_id)
    SELECT ?, ?, ?, ?, ?, ?, ?
    FROM shown_in si
    JOIN showtimes s ON si.showtime_id = s.id
    JOIN movie m ON si.movie_id = m.id
    WHERE si.movie_id = ?
      AND si.hall_id = ?
      AND si.showtime_id = ?
      AND si.status = 'active'
      AND s.status = 'active'
      AND (m.end_date IS NULL OR m.end_date >= CURDATE())
      AND TIMESTAMPADD(MINUTE, CAST(m.duration AS UNSIGNED), TIMESTAMP(s.showtime_date, s.movie_start_time)) > NOW()
      AND EXISTS (
        SELECT 1 FROM hallwise_seat hs
        WHERE hs.hall_id = ? AND hs.seat_id = ? AND hs.is_active = 1
      )
      AND NOT EXISTS (
        SELECT 1
        FROM ticket t
        JOIN payment tp ON tp.id = t.payment_id
        WHERE t.seat_id = ?
          AND t.hall_id = ?
          AND t.movie_id = ?
          AND t.showtimes_id = ?
          AND tp.payment_status <> 'EXPIRED'
      )
    LIMIT 1`;

  // Tạo thanh toán và vé trong transaction, bảo đảm xử lý lặp an toàn.
  const finalizePaymentOrderTickets = async (
    orderCode,
    {
      orderStatus = "PAID",
      paymentStatus = "PAID",
      allowExpiredOnline = false,
    } = {}
  ) => {
    const orderRows = await queryDbAsync(
      "SELECT * FROM payos_orders WHERE order_code = ?",
      [orderCode]
    );
  
    if (orderRows.length === 0) {
      const err = new Error("Không tìm thấy đơn thanh toán");
      err.statusCode = 404;
      throw err;
    }
  
    if (orderHasExpired(orderRows[0]) && !allowExpiredOnline) {
      await markOrderExpired(orderCode);
      const err = new Error("Đơn đã hết thời gian giữ ghế");
      err.statusCode = 409;
      err.code = "ORDER_EXPIRED";
      throw err;
    }

    if (orderRows[0].payment_id && orderRows[0].ticket_ids_json) {
      const ticketIds = parsePayOSOrderPayload(orderRows[0].ticket_ids_json) || [];
      await queryDbAsync(
        "UPDATE payment SET payment_status = ? WHERE id = ?",
        [paymentStatus, orderRows[0].payment_id]
      );
      await queryDbAsync(
        "UPDATE payos_orders SET status = ?, error_message = NULL WHERE order_code = ?",
        [orderStatus, orderCode]
      );
      return ticketIds.map((id) => ({ id }));
    }
  
    let transaction;
  
    try {
      if (typeof withTransaction !== "function") {
        throw new Error("Transaction service is unavailable");
      }
      transaction = await withTransaction();
      const transactionQuery = transaction.query;
  
      const lockedRows = await transactionQuery(
        "SELECT * FROM payos_orders WHERE order_code = ? FOR UPDATE",
        [orderCode]
      );
      const lockedOrder = lockedRows[0];

      if (orderHasExpired(lockedOrder) && !allowExpiredOnline) {
        const err = new Error("Đơn đã hết thời gian giữ ghế");
        err.statusCode = 409;
        err.code = "ORDER_EXPIRED";
        throw err;
      }
  
      if (lockedOrder.payment_id && lockedOrder.ticket_ids_json) {
        const ticketIds = parsePayOSOrderPayload(lockedOrder.ticket_ids_json) || [];
        await transactionQuery(
          "UPDATE payment SET payment_status = ? WHERE id = ?",
          [paymentStatus, lockedOrder.payment_id]
        );
        await transactionQuery(
          "UPDATE payos_orders SET status = ?, error_message = NULL WHERE order_code = ?",
          [orderStatus, orderCode]
        );
        await transaction.commit();
        transaction.release();
        transaction = null;
        return ticketIds.map((id) => ({ id }));
      }
  
      const payload = parsePayOSOrderPayload(lockedOrder.payload_json);
      const isConcessionOrder = payload?.orderType === "CONCESSION";
      if (
        !payload ||
        (!isConcessionOrder && (!Array.isArray(payload.seatIds) || payload.seatIds.length === 0)) ||
        (isConcessionOrder && (!Array.isArray(payload.comboItems) || payload.comboItems.length === 0))
      ) {
        throw new Error("Dữ liệu đơn thanh toán không hợp lệ");
      }

      const seatIds = isConcessionOrder ? [] : normalizeSeatIds(payload.seatIds);
      if (!isConcessionOrder) {
        await assertShowtimeBookable({
          movieId: payload.userMovieId,
          hallId: payload.userHallId,
          showtimeId: payload.userShowtimeId,
          query: transactionQuery,
        });
        const lockedSeats = await transactionQuery(
          "SELECT id FROM seat WHERE id IN (?) ORDER BY id FOR UPDATE",
          [seatIds]
        );
        if (lockedSeats.length !== seatIds.length) {
          throw new Error("Danh sách ghế của đơn không còn hợp lệ");
        }
      }
  
      const paymentMethod = lockedOrder.payment_method || payload.paymentMethod || "PayOS";
      const seatPriceById = new Map(
        (Array.isArray(payload.seatPrices) ? payload.seatPrices : []).map((seat) => [
          Number(seat.seatId),
          Number(seat.finalPrice),
        ])
      );
      const paymentResult = await transactionQuery(
        "INSERT INTO payment(amount,method,customer_email,payment_status) VALUES(?,?,?,?)",
        [payload.amount, paymentMethod, payload.email, paymentStatus]
      );
      const paymentId = paymentResult.insertId;
      const ticketIds = [];
  
      for (const seatId of seatIds) {
        const ticketResult = await transactionQuery(ticketInsertSql, [
          seatPriceById.get(Number(seatId)) || payload.seatPrice,
          getTodayDateKey(),
          paymentId,
          seatId,
          payload.userHallId,
          payload.userMovieId,
          payload.userShowtimeId,
          payload.userMovieId,
          payload.userHallId,
          payload.userShowtimeId,
          payload.userHallId,
          seatId,
          seatId,
          payload.userHallId,
          payload.userMovieId,
          payload.userShowtimeId,
        ]);
  
        if (ticketResult.affectedRows === 0) {
          throw new Error("Suất chiếu đã ngưng bán hoặc ghế đã được đặt");
        }
  
        ticketIds.push(ticketResult.insertId);
      }

      await settlePaidOrderRewards?.(transactionQuery, {
        orderCode,
        email: payload.email,
        paidAmount: payload.amount,
      });
  
      await transactionQuery(
        `UPDATE payos_orders
         SET status = ?, payment_id = ?, ticket_ids_json = ?, error_message = NULL
         WHERE order_code = ?`,
        [orderStatus, paymentId, JSON.stringify(ticketIds), orderCode]
      );
  
      await transaction.commit();
      transaction.release();
      transaction = null;
  
      return ticketIds.map((id) => ({ id }));
    } catch (err) {
      if (transaction) {
        await transaction.rollback().catch(() => {});
        transaction.release();
        transaction = null;
      }
  
      if (err.code === "ORDER_EXPIRED") {
        await markOrderExpired(orderCode).catch(() => {});
      } else {
        await queryDbAsync(
          "UPDATE payos_orders SET status = 'FAILED', error_message = ? WHERE order_code = ? AND status NOT IN ('PAID', 'EXPIRED')",
          [err.desc || err.message, orderCode]
        ).catch(() => {});
        await releaseRewardHold?.(orderCode).catch(() => {});
      }
  
      throw err;
    }
  };

  return {
    getPayOSClient,
    parsePayOSOrderPayload,
    generatePayOSOrderCode,
    normalizeSeatIds,
    getHeldOrderSeatIds,
    buildPaymentOrderPayload,
    finalizePaymentOrderTickets,
    orderHasExpired,
    markOrderExpired,
    expireStaleOrders,
    startExpirationScheduler,
    ONLINE_PAYMENT_WINDOW_MINUTES,
    COUNTER_HOLD_WINDOW_MINUTES,
  };
};

module.exports = createPaymentService;
