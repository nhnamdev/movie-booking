const createCustomerController = ({
  queryDbAsync,
  parsePayOSOrderPayload,
  releaseSeatHolds,
  releaseRewardHold,
  expireStaleOrders,
}) => {
  const customerProfile = (req, res) => res.json([req.user]);

  const customerHeldOrders = async (req, res) => {
    try {
      if (typeof expireStaleOrders === "function") {
        await expireStaleOrders();
      }
      const orders = await queryDbAsync(
        `SELECT PO.id, PO.order_code, PO.status, PO.fulfillment_status, PO.amount, PO.payment_method,
          PO.payment_id, PO.payload_json, PO.created_at, PO.expires_at, PO.checkout_url
         FROM payos_orders PO
         WHERE PO.customer_email = ?
           AND PO.status IN ('UNPAID', 'PENDING')
           AND (PO.expires_at IS NULL OR PO.expires_at > NOW())
         ORDER BY PO.created_at DESC, PO.id DESC`,
        [req.user.email]
      );

      const heldList = orders.map((order) => {
        const payload = parsePayOSOrderPayload(order.payload_json) || {};
        const seatNames = Array.isArray(payload.seatPrices)
          ? payload.seatPrices.map((seat) => seat.seatName).filter(Boolean)
          : [];
        return {
          order_code: order.order_code,
          order_type: payload.orderType || "TICKET",
          payment_method: order.payment_method || payload.paymentMethod || "Thanh toán tại rạp",
          status: order.status,
          checkout_url: order.checkout_url,
          seat_numbers: seatNames.join(", "),
          theatre_name: payload.theatreName || "",
          theatre_address: payload.theatreAddress || "",
          hall_name: payload.hallName || "",
          movie_name: payload.movieName || (payload.orderType === "CONCESSION" ? "Đơn bắp nước" : "Vé xem phim"),
          movie_id: payload.userMovieId || null,
          movie_image: payload.movieImage || null,
          movie_start_time: payload.movieStartTime || null,
          show_type: payload.showType || null,
          showtime_date: payload.showtimeDate || null,
          combo_items: Array.isArray(payload.comboItems) ? payload.comboItems : [],
          ticket_subtotal: Number(payload.ticketSubtotal || 0),
          combo_subtotal: Number(payload.comboSubtotal || 0),
          combo_discount: Number(payload.comboDiscount || 0),
          combo_total: Number(payload.comboTotal || 0),
          gross_amount: Number(payload.grossAmount ?? order.amount ?? 0),
          reward_points_used: Number(payload.rewardPointsUsed || 0),
          reward_discount: Number(payload.rewardDiscount || 0),
          total_amount: Number(order.amount || 0),
          created_at: order.created_at,
          expires_at: order.expires_at,
        };
      });

      return res.json(heldList);
    } catch (err) {
      console.error("Customer held orders load error:", err.message);
      return res.status(500).json({ message: "Không thể tải danh sách vé đang giữ" });
    }
  };

  const customerCancelHeldOrder = async (req, res) => {
    const orderCode = Number(req.body.orderCode);
    if (!orderCode) {
      return res.status(400).json({ message: "Mã đơn hàng không hợp lệ" });
    }

    try {
      const rows = await queryDbAsync(
        `SELECT order_code, status, customer_email FROM payos_orders
         WHERE order_code = ? AND customer_email = ?`,
        [orderCode, req.user.email]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy đơn giữ chỗ hoặc đơn không thuộc về bạn" });
      }

      const order = rows[0];
      if (!["UNPAID", "PENDING"].includes(order.status)) {
        return res.status(400).json({ message: "Chỉ có thể hủy đơn đang trong trạng thái giữ chỗ" });
      }

      await queryDbAsync(
        `UPDATE payos_orders
         SET status = 'EXPIRED', error_message = 'Khách hàng chủ động hủy giữ chỗ'
         WHERE order_code = ?`,
        [orderCode]
      );

      if (typeof releaseSeatHolds === "function") {
        await releaseSeatHolds(orderCode);
      }
      if (typeof releaseRewardHold === "function") {
        await releaseRewardHold(orderCode);
      }

      return res.json({ message: "Đã hủy giữ chỗ thành công" });
    } catch (err) {
      console.error("Customer cancel held order error:", err.message);
      return res.status(500).json({ message: "Không thể hủy giữ chỗ" });
    }
  };

  const customerPurchases = async (req, res) => {
    try {
      const [orders, legacyOrders] = await Promise.all([queryDbAsync(
        `SELECT PO.id, PO.order_code, PO.status, PO.fulfillment_status, PO.amount, PO.payment_method,
          PO.payment_id, PO.ticket_ids_json, PO.payload_json, PO.created_at,
          P.payment_status
         FROM payos_orders PO
         LEFT JOIN payment P ON P.id = PO.payment_id
         WHERE PO.customer_email = ? AND PO.status IN ('PAID', 'FULFILLED', 'READY', 'PICKED_UP')
         ORDER BY PO.created_at DESC, PO.id DESC`,
        [req.user.email]
      ), queryDbAsync(
        `SELECT
          P.id AS payment_id,
          MAX(P.payment_time) AS payment_time,
          MAX(P.amount) AS amount,
          MAX(P.method) AS method,
          MAX(P.payment_status) AS payment_status,
          GROUP_CONCAT(DISTINCT T.id ORDER BY T.id SEPARATOR ', ') AS ticket_ids,
          GROUP_CONCAT(DISTINCT COALESCE(T.seat_label_snapshot, HS.seat_label, SE.name)
            ORDER BY COALESCE(HS.row_index, 0), COALESCE(HS.column_index, 0) SEPARATOR ', ') AS seat_numbers,
          MAX(COALESCE(T.theatre_name_snapshot, TH.name)) AS theatre_name,
          MAX(COALESCE(T.hall_name_snapshot, H.name)) AS hall_name,
          MAX(M.name) AS movie_name,
          T.movie_id AS movie_id,
          MAX(M.image_path) AS movie_image,
          MAX(S.movie_start_time) AS movie_start_time,
          MAX(S.show_type) AS show_type,
          MAX(DATE_FORMAT(S.showtime_date, '%Y-%m-%d')) AS showtime_date,
          SUM(T.price) AS ticket_subtotal
         FROM payment P
         JOIN ticket T ON T.payment_id = P.id
         JOIN movie M ON M.id = T.movie_id
         JOIN hall H ON H.id = T.hall_id
         JOIN theatre TH ON TH.id = H.theatre_id
         JOIN showtimes S ON S.id = T.showtimes_id
         LEFT JOIN hallwise_seat HS ON HS.hall_id = T.hall_id AND HS.seat_id = T.seat_id
         LEFT JOIN seat SE ON SE.id = T.seat_id
         WHERE P.customer_email = ?
           AND COALESCE(P.payment_status, 'PAID') = 'PAID'
           AND T.ticket_status IN ('ISSUED', 'CHECKED_IN')
           AND NOT EXISTS (SELECT 1 FROM payos_orders PO WHERE PO.payment_id = P.id)
         GROUP BY P.id, T.movie_id, T.hall_id, T.showtimes_id
         ORDER BY MAX(P.payment_time) DESC, P.id DESC`,
        [req.user.email]
      )]);

      const purchases = orders.map((order) => {
        const payload = parsePayOSOrderPayload(order.payload_json) || {};
        const ticketIds = parsePayOSOrderPayload(order.ticket_ids_json) || [];
        const seatNames = Array.isArray(payload.seatPrices)
          ? payload.seatPrices.map((seat) => seat.seatName).filter(Boolean)
          : [];
        return {
          order_code: order.order_code,
          order_type: payload.orderType || "TICKET",
          payment_id: order.payment_id,
          payment_method: order.payment_method || payload.paymentMethod,
          payment_status: order.payment_status || order.status,
          fulfillment_status: order.fulfillment_status || "PENDING",
          ticket_ids: ticketIds.join(", "),
          seat_numbers: seatNames.join(", "),
          theatre_name: payload.theatreName || "",
          hall_name: payload.hallName || "",
          movie_name: payload.movieName || "Đơn bắp nước",
          movie_id: payload.userMovieId || null,
          movie_image: payload.movieImage || null,
          movie_start_time: payload.movieStartTime || null,
          show_type: payload.showType || null,
          showtime_date: payload.showtimeDate || null,
          combo_items: Array.isArray(payload.comboItems) ? payload.comboItems : [],
          ticket_subtotal: Number(payload.ticketSubtotal || 0),
          combo_subtotal: Number(payload.comboSubtotal || 0),
          combo_discount: Number(payload.comboDiscount || 0),
          combo_total: Number(payload.comboTotal || 0),
          gross_amount: Number(payload.grossAmount ?? order.amount ?? 0),
          reward_points_used: Number(payload.rewardPointsUsed || 0),
          reward_discount: Number(payload.rewardDiscount || 0),
          total_amount: Number(order.amount || 0),
          purchase_date: order.created_at,
        };
      });

      const normalizedLegacyOrders = legacyOrders.map((order) => ({
        order_code: `LEGACY-${order.payment_id}`,
        order_type: "TICKET",
        payment_id: order.payment_id,
        payment_method: order.method,
        payment_status: order.payment_status || "PAID",
        fulfillment_status: "NOT_APPLICABLE",
        ticket_ids: order.ticket_ids || "",
        seat_numbers: order.seat_numbers || "",
        theatre_name: order.theatre_name || "",
        hall_name: order.hall_name || "",
        movie_name: order.movie_name,
        movie_id: order.movie_id,
        movie_image: order.movie_image,
        movie_start_time: order.movie_start_time,
        show_type: order.show_type,
        showtime_date: order.showtime_date,
        combo_items: [],
        ticket_subtotal: Number(order.ticket_subtotal || order.amount || 0),
        combo_subtotal: 0,
        combo_discount: 0,
        combo_total: 0,
        gross_amount: Number(order.amount || 0),
        reward_points_used: 0,
        reward_discount: 0,
        total_amount: Number(order.amount || 0),
        purchase_date: order.payment_time,
      }));

      return res.json([...purchases, ...normalizedLegacyOrders].sort(
        (first, second) => new Date(second.purchase_date) - new Date(first.purchase_date)
      ));
    } catch (err) {
      console.error("Customer purchases load error:", err.message);
      return res.status(500).json({ message: "Không thể tải lịch sử mua hàng" });
    }
  };

  return { customerProfile, customerPurchases, customerHeldOrders, customerCancelHeldOrder };
};

module.exports = createCustomerController;
