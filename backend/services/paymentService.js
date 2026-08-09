const { PayOS } = require("@payos/node");

// Xử lý nghiệp vụ giữ ghế, đơn PayOS và phát hành vé.
const createPaymentService = ({ queryDbAsync }) => {
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

  // Tìm các ghế đang được giữ bởi đơn chưa thanh toán còn hiệu lực.
  const getHeldOrderSeatIds = async ({ hallId, movieId, showtimeId }) => {
    const rows = await queryDbAsync(
      `SELECT order_code, status, payment_method, payload_json, created_at
       FROM payos_orders
       WHERE status IN ('UNPAID', 'PENDING')
         AND payment_id IS NULL`
    );
    const heldSeatIds = new Set();
    const now = Date.now();
  
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
  
      const status = String(row.status || "").toUpperCase();
      const method = row.payment_method || "PayOS";
      const createdAt = new Date(row.created_at).getTime();
      const payOSStillHolding =
        method === "PayOS" &&
        status === "PENDING" &&
        Number.isFinite(createdAt) &&
        now - createdAt <= 20 * 60 * 1000;
  
      if (status !== "UNPAID" && !payOSStillHolding) return;
  
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
  
    const showRows = await queryDbAsync(
      `SELECT
        S.price_per_seat,
        S.movie_start_time,
        DATE_FORMAT(S.showtime_date, '%Y-%m-%d') AS showtime_date,
        H.name AS hall_name,
        M.name AS movie_name
       FROM shown_in SI
       JOIN showtimes S ON SI.showtime_id = S.id
       JOIN hall H ON SI.hall_id = H.id
       JOIN movie M ON SI.movie_id = M.id
       WHERE SI.movie_id = ?
         AND SI.hall_id = ?
         AND SI.showtime_id = ?
         AND SI.status = 'active'
         AND S.status = 'active'
       LIMIT 1`,
      [movieId, hallId, showtimeId]
    );
  
    if (showRows.length === 0) {
      const err = new Error("Suất chiếu đã ngưng bán");
      err.statusCode = 409;
      throw err;
    }
  
    const availableSeats = await queryDbAsync(
      `SELECT S.id
       FROM seat S
       JOIN hallwise_seat HS ON S.id = HS.seat_id
       WHERE HS.hall_id = ?
         AND S.id IN (?)
         AND NOT EXISTS (
           SELECT 1
           FROM ticket T
           WHERE T.seat_id = S.id
             AND T.hall_id = ?
             AND T.movie_id = ?
             AND T.showtimes_id = ?
         )`,
      [hallId, normalizedSeatIds, hallId, movieId, showtimeId]
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
  
    const seatPrice = Number(showRows[0].price_per_seat);
    const amount = seatPrice * normalizedSeatIds.length;
  
    return {
      amount,
      normalizedSeatIds,
      seatPrice,
      show: showRows[0],
      payload: {
        email,
        seatIds: normalizedSeatIds,
        userHallId: hallId,
        userMovieId: movieId,
        userShowtimeId: showtimeId,
        seatPrice,
        amount,
        paymentMethod,
        movieName: showRows[0].movie_name,
        hallName: showRows[0].hall_name,
        showtimeDate: showRows[0].showtime_date,
        movieStartTime: showRows[0].movie_start_time,
      },
    };
  };

  // Chỉ chèn vé khi suất còn mở và ghế chưa được bán.
  const ticketInsertSql = `
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

  // Tạo thanh toán và vé trong transaction, bảo đảm xử lý lặp an toàn.
  const finalizePaymentOrderTickets = async (
    orderCode,
    { orderStatus = "PAID", paymentStatus = "PAID" } = {}
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
  
    let transactionStarted = false;
  
    try {
      await queryDbAsync("START TRANSACTION");
      transactionStarted = true;
  
      const lockedRows = await queryDbAsync(
        "SELECT * FROM payos_orders WHERE order_code = ? FOR UPDATE",
        [orderCode]
      );
      const lockedOrder = lockedRows[0];
  
      if (lockedOrder.payment_id && lockedOrder.ticket_ids_json) {
        const ticketIds = parsePayOSOrderPayload(lockedOrder.ticket_ids_json) || [];
        await queryDbAsync(
          "UPDATE payment SET payment_status = ? WHERE id = ?",
          [paymentStatus, lockedOrder.payment_id]
        );
        await queryDbAsync(
          "UPDATE payos_orders SET status = ?, error_message = NULL WHERE order_code = ?",
          [orderStatus, orderCode]
        );
        await queryDbAsync("COMMIT");
        transactionStarted = false;
        return ticketIds.map((id) => ({ id }));
      }
  
      const payload = parsePayOSOrderPayload(lockedOrder.payload_json);
      if (!payload || !Array.isArray(payload.seatIds) || payload.seatIds.length === 0) {
        throw new Error("Dữ liệu đơn thanh toán không hợp lệ");
      }
  
      const paymentMethod = lockedOrder.payment_method || payload.paymentMethod || "PayOS";
      const paymentResult = await queryDbAsync(
        "INSERT INTO payment(amount,method,customer_email,payment_status) VALUES(?,?,?,?)",
        [payload.amount, paymentMethod, payload.email, paymentStatus]
      );
      const paymentId = paymentResult.insertId;
      const ticketIds = [];
  
      for (const seatId of payload.seatIds) {
        const ticketResult = await queryDbAsync(ticketInsertSql, [
          payload.seatPrice,
          getTodayDateKey(),
          paymentId,
          seatId,
          payload.userHallId,
          payload.userMovieId,
          payload.userShowtimeId,
          payload.userMovieId,
          payload.userHallId,
          payload.userShowtimeId,
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
  
      await queryDbAsync(
        `UPDATE payos_orders
         SET status = ?, payment_id = ?, ticket_ids_json = ?, error_message = NULL
         WHERE order_code = ?`,
        [orderStatus, paymentId, JSON.stringify(ticketIds), orderCode]
      );
  
      await queryDbAsync("COMMIT");
      transactionStarted = false;
  
      return ticketIds.map((id) => ({ id }));
    } catch (err) {
      if (transactionStarted) {
        await queryDbAsync("ROLLBACK").catch(() => {});
      }
  
      await queryDbAsync(
        "UPDATE payos_orders SET status = 'FAILED', error_message = ? WHERE order_code = ? AND status <> 'PAID'",
        [err.desc || err.message, orderCode]
      ).catch(() => {});
  
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
  };
};

module.exports = createPaymentService;
