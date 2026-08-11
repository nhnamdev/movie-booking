// Xử lý quản lý đơn hàng, phim, lịch chiếu và thống kê.
const normalizeTrailerUrl = (value) => {
  const rawUrl = String(value || "").trim();
  if (!rawUrl) return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch (_error) {
    throw Object.assign(new Error("Link trailer không hợp lệ"), { statusCode: 400 });
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
  let videoId = "";
  if (hostname === "youtu.be") {
    videoId = parsedUrl.pathname.split("/").filter(Boolean)[0] || "";
  } else if (["youtube.com", "m.youtube.com"].includes(hostname)) {
    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    if (parsedUrl.pathname === "/watch") videoId = parsedUrl.searchParams.get("v") || "";
    else if (["embed", "shorts", "live"].includes(segments[0])) videoId = segments[1] || "";
  }

  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw Object.assign(new Error("Trailer phải là link video YouTube hợp lệ"), { statusCode: 400 });
  }
  return `https://www.youtube.com/watch?v=${videoId}`;
};

const createAdminController = (dependencies) => {
  const {
    db,
    queryDbAsync,
    withTransaction,
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
    frontendUrl,
    maskEmail,
    logRegisterDebug,
    verifyAdmin,
    adminAuthFailed,
    queryDb,
    requireAdmin,
    requireRole,
    roleAuthFailed,
    normalizeAdminList,
    assertMovieShowtimeDate,
    assertNoShowtimeOverlap,
    assertHallSupportsShowtime,
    getMoviePerformance,
    toAdminOrder,
    uploadToR2,
    deleteFromR2,
    generateFileName,
  } = dependencies;

  const requireOperator = (email, password) =>
    requireRole(email, password, ["Admin", "Staff"]);

  // Lấy tối đa 200 đơn hàng và lọc theo trạng thái.
  const adminOrders = async (req, res) => {
  const { email, password } = req.body;
  const statusFilter = String(req.body.status || "ALL").toUpperCase();

  try {
    const isOperator = await requireOperator(email, password);
    if (!isOperator) return roleAuthFailed(res);
    await expireStaleOrders();

    const allowedStatuses = ["UNPAID", "PAID", "PENDING", "FAILED", "EXPIRED"];
    const whereSql = allowedStatuses.includes(statusFilter)
      ? "WHERE PO.status = ?"
      : "";
    const params = whereSql ? [statusFilter] : [];
    const rows = await queryDb(
      `SELECT
        PO.id,
        PO.order_code,
        PO.status,
        PO.amount,
        PO.customer_email,
        PO.payment_method,
        PO.fulfillment_status,
        PO.fulfilled_at,
        PO.fulfilled_by,
        PO.ticket_checked_in_at,
        PO.ticket_checked_in_by,
        PA.payment_status,
        PO.payment_id,
        PO.ticket_ids_json,
        PO.payload_json,
        PO.error_message,
        PO.checkout_url,
        PO.expires_at,
        PO.created_at,
        PO.updated_at
       FROM payos_orders PO
       LEFT JOIN payment PA ON PO.payment_id = PA.id
       ${whereSql}
       ORDER BY PO.created_at DESC
       LIMIT 200`,
      params
    );

    return res.json(rows.map(toAdminOrder));
  } catch (err) {
    console.error("Admin orders load error:", err);
    return res.status(500).json({ message: "Không thể tải danh sách đơn hàng" });
  }
};

  // Chuyển đơn giữa trạng thái chưa trả và đã thanh toán.
  const adminOrderStatusUpdate = async (req, res) => {
  const { email, password } = req.body;
  const orderCode = Number(req.body.orderCode);
  const status = String(req.body.status || "").toUpperCase();

  if (!orderCode || !["UNPAID", "PAID"].includes(status)) {
    return res.status(400).json({ message: "Dữ liệu trạng thái đơn hàng không hợp lệ" });
  }

  try {
    const isOperator = await requireOperator(email, password);
    if (!isOperator) return roleAuthFailed(res);
    await expireStaleOrders();

    const orderRows = await queryDb(
      "SELECT * FROM payos_orders WHERE order_code = ?",
      [orderCode]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const order = orderRows[0];

    if (order.payment_method !== "Thanh toán tại rạp") {
      return res.status(409).json({
        message: "Trạng thái đơn PayOS chỉ được cập nhật qua đối soát PayOS",
      });
    }

    if (orderHasExpired(order)) {
      await markOrderExpired(orderCode);
      return res.status(409).json({ message: "Đơn đã hết thời gian giữ ghế" });
    }

    if (status === "UNPAID") {
      if (order.status === "PAID") {
        return res.status(409).json({ message: "Không thể chuyển đơn đã thanh toán về chưa trả" });
      }
      if (order.payment_id) {
        await queryDb(
          "UPDATE payment SET payment_status = 'UNPAID' WHERE id = ?",
          [order.payment_id]
        );
      }
      await queryDb(
        "UPDATE payos_orders SET status = 'UNPAID', error_message = NULL WHERE order_code = ?",
        [orderCode]
      );
      const ticketIds = parsePayOSOrderPayload(order.ticket_ids_json) || [];
      return res.json({
        orderCode,
        status: "UNPAID",
        tickets: ticketIds.map((id) => ({ id })),
      });
    }

    if (order.status !== "UNPAID") {
      return res.status(409).json({ message: "Đơn không còn ở trạng thái chờ thanh toán" });
    }

    const tickets = await finalizePaymentOrderTickets(orderCode);
    return res.json({ orderCode, status: "PAID", tickets });
  } catch (err) {
    console.error("Admin order status update error:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Không thể cập nhật trạng thái đơn hàng",
    });
  }
};

  const adminOrderFulfillmentUpdate = async (req, res) => {
    const orderCode = Number(req.body.orderCode);
    const status = String(req.body.status || "").toUpperCase();
    if (!orderCode || !["PREPARING", "READY", "PICKED_UP"].includes(status)) {
      return res.status(400).json({ message: "Trạng thái giao bắp nước không hợp lệ" });
    }
    try {
      const rows = await queryDb(
        "SELECT status, fulfillment_status, payload_json FROM payos_orders WHERE order_code = ?",
        [orderCode]
      );
      const order = rows[0];
      const payload = parsePayOSOrderPayload(order?.payload_json) || {};
      if (!order || order.status !== "PAID") {
        return res.status(409).json({ message: "Chỉ xử lý bắp nước cho đơn đã thanh toán" });
      }
      if (!Array.isArray(payload.comboItems) || payload.comboItems.length === 0) {
        return res.status(409).json({ message: "Đơn này không có bắp nước" });
      }
      const currentStatus = order.fulfillment_status || "PENDING";
      const nextStatus = { PENDING: "PREPARING", PREPARING: "READY", READY: "PICKED_UP" }[currentStatus];
      if (status === currentStatus) {
        return res.json({ orderCode, fulfillmentStatus: currentStatus });
      }
      if (status !== nextStatus) {
        return res.status(409).json({
          message: `Không thể chuyển trạng thái giao bắp nước từ ${currentStatus} sang ${status}`,
        });
      }
      await queryDb(
        `UPDATE payos_orders SET fulfillment_status = ?,
          fulfilled_at = CASE WHEN ? = 'PICKED_UP' THEN NOW() ELSE fulfilled_at END,
          fulfilled_by = ? WHERE order_code = ?`,
        [status, status, req.user.email, orderCode]
      );
      return res.json({ orderCode, fulfillmentStatus: status });
    } catch (err) {
      return res.status(500).json({ message: err.message || "Không thể cập nhật giao bắp nước" });
    }
  };

  const adminTicketCheckIn = async (req, res) => {
    const orderCode = Number(req.body.orderCode);
    if (!orderCode) return res.status(400).json({ message: "Mã đơn không hợp lệ" });
    try {
      const rows = await queryDb(
        `SELECT PO.status, PO.payment_id, PO.ticket_checked_in_at
         FROM payos_orders PO WHERE PO.order_code = ? LIMIT 1`,
        [orderCode]
      );
      const order = rows[0];
      if (!order || order.status !== "PAID" || !order.payment_id) {
        return res.status(409).json({ message: "Đơn chưa thanh toán hoặc không có vé" });
      }
      if (order.ticket_checked_in_at) {
        return res.status(409).json({ message: "Vé của đơn này đã được check-in" });
      }
      const transaction = await withTransaction();
      try {
        const tickets = await transaction.query(
          `SELECT T.id FROM ticket T
           JOIN showtimes S ON S.id = T.showtimes_id
           JOIN movie M ON M.id = T.movie_id
           WHERE T.payment_id = ? AND T.ticket_status = 'ISSUED'
             AND TIMESTAMP(S.showtime_date, S.movie_start_time) >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
             AND TIMESTAMP(S.showtime_date, S.movie_start_time) <= DATE_ADD(NOW(), INTERVAL 30 MINUTE)
             AND TIMESTAMPADD(MINUTE, CAST(M.duration AS UNSIGNED), TIMESTAMP(S.showtime_date, S.movie_start_time)) > NOW()
           FOR UPDATE`,
          [order.payment_id]
        );
        if (tickets.length === 0) {
          throw Object.assign(new Error("Vé không còn trong thời gian check-in hoặc đã được sử dụng"), { statusCode: 409 });
        }
        await transaction.query(
          "UPDATE ticket SET ticket_status = 'CHECKED_IN', checked_in_at = NOW(), checked_in_by = ? WHERE payment_id = ?",
          [req.user.email, order.payment_id]
        );
        await transaction.query(
          "UPDATE payos_orders SET ticket_checked_in_at = NOW(), ticket_checked_in_by = ? WHERE order_code = ?",
          [req.user.email, orderCode]
        );
        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        throw err;
      } finally {
        transaction.release();
      }
      return res.json({ orderCode, checkedIn: true });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ message: err.message || "Không thể check-in vé" });
    }
  };

  // Lấy danh sách phim kèm thể loại, đạo diễn và số vé.
  const adminMovies = (req, res) => {
  const { email, password } = req.body;

  verifyAdmin(email, password, (authErr, isAdmin) => {
    if (authErr) return res.status(500).json(authErr);
    if (!isAdmin) return adminAuthFailed(res);

    const sql = `
      SELECT
        m.id,
        m.name,
        m.image_path,
        m.trailer_url,
        m.language,
        m.synopsis,
        m.rating,
        m.duration,
        m.top_cast,
        m.release_date,
        m.end_date,
        GROUP_CONCAT(DISTINCT mg.genre ORDER BY mg.genre SEPARATOR ', ') AS genres,
        GROUP_CONCAT(DISTINCT md.director ORDER BY md.director SEPARATOR ', ') AS directors,
        COUNT(DISTINCT si.showtime_id) AS showtime_count,
        COUNT(DISTINCT t.id) AS ticket_count
      FROM movie m
      LEFT JOIN movie_genre mg ON m.id = mg.movie_id
      LEFT JOIN movie_directors md ON m.id = md.movie_id
      LEFT JOIN shown_in si ON m.id = si.movie_id
      LEFT JOIN ticket t ON m.id = t.movie_id
      GROUP BY m.id
      ORDER BY m.release_date DESC, m.id DESC
    `;

    db.query(sql, (err, data) => {
      if (err) return res.status(500).json(err);
      return res.json(data);
    });
  });
};

  // Cập nhật phim cùng toàn bộ thể loại và đạo diễn trong transaction.
  const adminMovieUpdate = async (req, res) => {
  const {
    email,
    password,
    movieId,
    name,
    image_path,
    language,
    synopsis,
    rating,
    duration,
    top_cast,
    release_date,
    end_date,
    trailer_url,
  } = req.body;
  const genres = normalizeAdminList(req.body.genres);
  const directors = normalizeAdminList(req.body.directors);

  verifyAdmin(email, password, async (authErr, isAdmin) => {
    if (authErr) return res.status(500).json(authErr);
    if (!isAdmin) return adminAuthFailed(res);

    if (!movieId || !name || !image_path || !language || !synopsis || !rating || !duration || !top_cast || !release_date || !end_date) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin phim" });
    }
    if (String(end_date) < String(release_date)) {
      return res.status(400).json({ message: "Ngày kết thúc phải từ ngày phát hành trở đi" });
    }
    if (!Number.isInteger(Number(duration)) || Number(duration) <= 0) {
      return res.status(400).json({ message: "Thời lượng phim phải là số phút hợp lệ" });
    }
    let normalizedTrailerUrl;
    try {
      normalizedTrailerUrl = normalizeTrailerUrl(trailer_url);
    } catch (err) {
      return res.status(err.statusCode || 400).json({ message: err.message });
    }

    let transaction;
    let previousImagePath = null;
    try {
      transaction = await withTransaction();
      const previousRows = await transaction.query("SELECT image_path FROM movie WHERE id = ? FOR UPDATE", [movieId]);
      previousImagePath = previousRows[0]?.image_path || null;
      if (image_path !== previousImagePath && !String(image_path).startsWith("/media/movies/")) {
        throw Object.assign(new Error("Ảnh phim mới phải được tải lên Cloudflare R2"), { statusCode: 400 });
      }
      const invalidSchedules = await transaction.query(
        `SELECT COUNT(*) AS invalidCount FROM shown_in SI
         JOIN showtimes S ON S.id = SI.showtime_id
         WHERE SI.movie_id = ? AND SI.status = 'active'
           AND (S.showtime_date < ? OR S.showtime_date > ?)`,
        [movieId, release_date, end_date]
      );
      if (Number(invalidSchedules[0].invalidCount) > 0) {
        throw Object.assign(new Error("Khoảng công chiếu mới không bao phủ các suất đang hoạt động"), { statusCode: 409 });
      }
      await transaction.query(
        `UPDATE movie
         SET name = ?, image_path = ?, trailer_url = ?, language = ?, synopsis = ?, rating = ?, duration = ?, top_cast = ?, release_date = ?, end_date = ?
         WHERE id = ?`,
        [name, image_path, normalizedTrailerUrl, language, synopsis, rating, duration, top_cast, release_date, end_date, movieId]
      );
      await transaction.query("DELETE FROM movie_genre WHERE movie_id = ?", [movieId]);
      await transaction.query("DELETE FROM movie_directors WHERE movie_id = ?", [movieId]);

      for (const genre of genres) {
        await transaction.query("INSERT INTO movie_genre(movie_id, genre) VALUES (?, ?)", [movieId, genre]);
      }

      for (const director of directors) {
        await transaction.query("INSERT INTO movie_directors(movie_id, director) VALUES (?, ?)", [movieId, director]);
      }
      const futureSchedules = await transaction.query(
        `SELECT SI.hall_id, S.id, DATE_FORMAT(S.showtime_date, '%Y-%m-%d') AS showtime_date, S.movie_start_time
         FROM shown_in SI JOIN showtimes S ON S.id = SI.showtime_id
         WHERE SI.movie_id = ? AND SI.status = 'active' AND S.status = 'active' AND S.showtime_date >= CURDATE()`,
        [movieId]
      );
      for (const schedule of futureSchedules) {
        await assertNoShowtimeOverlap({
          movieId,
          hallId: schedule.hall_id,
          showtimeDate: schedule.showtime_date,
          movieStartTime: schedule.movie_start_time,
          excludeShowtimeId: schedule.id,
          query: transaction.query,
        });
      }
      await transaction.commit();
      transaction.release();
      transaction = null;
      if (previousImagePath && previousImagePath !== image_path && previousImagePath.startsWith("/media/")) {
        await deleteFromR2(previousImagePath).catch((error) => console.error("Delete old movie image error:", error.message));
      }
      return res.json({ message: "Cập nhật phim thành công" });
    } catch (err) {
      if (transaction) {
        await transaction.rollback().catch(() => {});
        transaction.release();
      }
      return res.status(err.statusCode || 500).json({ message: err.message || "Không thể cập nhật phim" });
    }
  });
};

  // Xoá phim chưa phát sinh vé để bảo toàn lịch sử mua.
  const adminMovieDelete = (req, res) => {
  const { email, password, movieId } = req.body;

  verifyAdmin(email, password, async (authErr, isAdmin) => {
    if (authErr) return res.status(500).json(authErr);
    if (!isAdmin) return adminAuthFailed(res);
    if (!movieId) return res.status(400).json({ message: "Thiếu mã phim" });

    try {
      const movieRows = await queryDb("SELECT image_path FROM movie WHERE id = ?", [movieId]);
      const ticketRows = await queryDb("SELECT COUNT(*) AS ticketCount FROM ticket WHERE movie_id = ?", [movieId]);
      if (ticketRows[0].ticketCount > 0) {
        return res.status(409).json({
          message: "Không thể xoá phim đã có vé để tránh mất lịch sử mua vé",
        });
      }
      const scheduleRows = await queryDb(
        "SELECT COUNT(*) AS scheduleCount FROM shown_in WHERE movie_id = ?",
        [movieId]
      );
      if (Number(scheduleRows[0].scheduleCount) > 0) {
        return res.status(409).json({
          message: "Phim đang có suất chiếu. Hãy xoá các suất chưa có vé trước khi xoá phim",
        });
      }

      await queryDb("DELETE FROM movie WHERE id = ?", [movieId]);
      if (movieRows[0]?.image_path?.startsWith("/media/")) {
        await deleteFromR2(movieRows[0].image_path).catch((error) => console.error("Delete movie image error:", error.message));
      }
      return res.json({ message: "Xoá phim thành công" });
    } catch (err) {
      return res.status(500).json(err);
    }
  });
};

  // Thêm phim mới và trả về mã phim vừa tạo.
  const adminMovieAdd = async (req, res) => {
    const { name, image_path, trailer_url, language, synopsis, rating, duration, top_cast, release_date, end_date } = req.body;
    const genres = normalizeAdminList(req.body.genres);
    const directors = normalizeAdminList(req.body.directors);
    if (!name || !image_path || !language || !synopsis || !rating || !duration || !top_cast || !release_date || !end_date || genres.length === 0 || directors.length === 0) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin phim, thể loại và đạo diễn" });
    }
    if (!String(image_path).startsWith("/media/movies/")) {
      return res.status(400).json({ message: "Ảnh phim phải được tải lên Cloudflare R2" });
    }
    if (String(end_date) < String(release_date)) {
      return res.status(400).json({ message: "Ngày kết thúc phải từ ngày phát hành trở đi" });
    }
    if (!Number.isInteger(Number(duration)) || Number(duration) <= 0) {
      return res.status(400).json({ message: "Thời lượng phim phải là số phút hợp lệ" });
    }
    let normalizedTrailerUrl;
    try {
      normalizedTrailerUrl = normalizeTrailerUrl(trailer_url);
    } catch (err) {
      return res.status(err.statusCode || 400).json({ message: err.message });
    }
    const transaction = await withTransaction();
    try {
      const result = await transaction.query(
        `INSERT INTO movie (name,image_path,trailer_url,language,synopsis,rating,duration,top_cast,release_date,end_date)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [name, image_path, normalizedTrailerUrl, language, synopsis, rating, duration, top_cast, release_date, end_date]
      );
      for (const genre of genres) {
        await transaction.query("INSERT INTO movie_genre(movie_id,genre) VALUES (?,?)", [result.insertId, genre]);
      }
      for (const director of directors) {
        await transaction.query("INSERT INTO movie_directors(movie_id,director) VALUES (?,?)", [result.insertId, director]);
      }
      await transaction.commit();
      return res.status(201).json([{ last_id: result.insertId }]);
    } catch (err) {
      await transaction.rollback();
      return res.status(500).json({ message: err.message || "Không thể thêm phim" });
    } finally {
      transaction.release();
    }
  };

  // Đếm tổng số vé đã phát hành.
  const totalTickets = (req, res) => {
  const { email, password } = req.body;

  verifyAdmin(email, password, (authErr, isAdmin) => {
    if (authErr) return res.status(500).json(authErr);
    if (!isAdmin) return adminAuthFailed(res);

    const sql = `SELECT COUNT(*) AS total_tickets FROM ticket`;
    db.query(sql, (err, data) => {
      if (err) return res.json(err);
      return res.json(data);
    });
  });
};

  // Tính tổng giá trị các bản ghi thanh toán.
  const totalPayment = (req, res) => {
  const { email, password } = req.body;

  verifyAdmin(email, password, (authErr, isAdmin) => {
    if (authErr) return res.status(500).json(authErr);
    if (!isAdmin) return adminAuthFailed(res);

    const sql = `SELECT COALESCE(SUM(amount), 0) AS total_amount FROM payment`;
    db.query(sql, (err, data) => {
      if (err) return res.json(err);
      return res.json(data);
    });
  });
};

  // Đếm tổng số tài khoản khách hàng.
  const totalCustomers = (req, res) => {
  const { email, password } = req.body;

  verifyAdmin(email, password, (authErr, isAdmin) => {
    if (authErr) return res.status(500).json(authErr);
    if (!isAdmin) return adminAuthFailed(res);

    const sql = `SELECT COUNT(*) AS total_customers FROM person WHERE person_type='Customer'`;
    db.query(sql, (err, data) => {
      if (err) return res.json(err);
      return res.json(data);
    });
  });
};

  // Thống kê số vé đã bán theo từng phim.
  const totalTicketPerMovie = (req, res) => {
  const { email, password } = req.body;

  verifyAdmin(email, password, (authErr, isAdmin) => {
    if (authErr) return res.status(500).json(authErr);
    if (!isAdmin) return adminAuthFailed(res);

    const sql = `SELECT M.name,T.movie_id,COUNT(*) AS tickets_per_movie From ticket T JOIN movie M on T.movie_id = M.id GROUP BY movie_id`;
    db.query(sql, (err, data) => {
      if (err) return res.json(err);
      return res.json(data);
    });
  });
};

  // Gắn một thể loại cho phim.
  const genreInsert = (req, res) => {
  //admin revalidation
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  const movieId = req.body.movieId;
  const genre = req.body.genre;

  const sql = `Insert into movie_genre(movie_id,genre)
  values
  (?,?)`;

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql, [movieId, genre], (err, data) => {
      if (err) return res.json(err);

      return res.json(data);
    });
  });
};

  // Gắn một đạo diễn cho phim.
  const directorInsert = (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  const movieId = req.body.movieId;
  const director = req.body.director;

  const sql = `Insert into movie_directors(movie_id,director)
  values
  (?,?)`;

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql, [movieId, director], (err, data) => {
      if (err) return res.json(err);

      return res.json(data);
    });
  });
};

  // Lấy ngày chiếu xa nhất đang có trong hệ thống.
  const lastShowDate = (req, res) => {
  const sql = `SELECT max(showtime_date) as lastDate FROM showtimes`;

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  // Tạo ba khung giờ mặc định cho một ngày chiếu.
  const showdateAdd = (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  const showDate = req.body.selectedShowDate;
  const sql1 = `Insert into showtimes (movie_start_time,show_type,showtime_date,price_per_seat)
  values
  ('11:00 am','2D',?,350),
  ('2:30 pm','3D',?,450),
  ('6:00 pm','3D',?,450)`;

  const sql2 = "SELECT LAST_INSERT_ID() as last_id";

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql1, [showDate, showDate, showDate], (err1, data1) => {
      if (err1) return res.json(err1);

      db.query(sql2, (err2, data2) => {
        if (err2) return res.json(err2);

        return res.json(data2);
      });
    });
  });
};

  // Gán sẵn phim và phòng cho các suất chiếu vừa tạo.
  const shownInUpdate = (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  let showId = req.body.showtimeId;
  let showIdArr = [];

  for (let i = 1; i <= 24; i++) {
    if (i % 8 === 0) {
      showIdArr.push(showId);
      showId += 1;
    } else {
      showIdArr.push(showId);
    }
  }

  const sql = `Insert into shown_in(movie_id,showtime_id,hall_id)
  values
  (1,?,1),(5,?,2),(3,?,3),(4,?,4),(1,?,5),(5,?,6),(3,?,7),(4,?,8),
  (5,?,1),(6,?,2),(1,?,3),(2,?,4),(5,?,5),(6,?,6),(1,?,7),(2,?,8),
  (5,?,1),(6,?,2),(1,?,3),(2,?,4),(4,?,5),(6,?,6),(1,?,7),(2,?,8)`;

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql, showIdArr, (err, data) => {
      if (err) return res.json(err);

      return res.json(data);
    });
  });
};

  // Lấy bốn ngày chiếu đang hoạt động gần nhất.
  const adminLatestShowDates = (req, res) => {
  const sql = `SELECT DISTINCT s.showtime_date
  FROM showtimes s
  JOIN (
      SELECT DISTINCT showtime_date
      FROM showtimes
      WHERE status = 'active'
      ORDER BY showtime_date DESC
      LIMIT 4
  ) latest_dates
  ON s.showtime_date = latest_dates.showtime_date
  WHERE s.status = 'active'
  ORDER BY s.showtime_date ASC
  `;

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  // Lấy các suất chiếu đang hoạt động theo ngày.
  const adminShowtimes = (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  const showdate = req.body.selectedShowDate;

  const sql = `SELECT id,movie_start_time,show_type FROM showtimes WHERE showtime_date=? AND status = 'active'`;

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql, [showdate], (err, data) => {
      if (err) return res.json(err);

      return res.json(data);
    });
  });
};

  // Lấy các phim hiện được gán cho một suất chiếu.
  const movieReplaceFrom = (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  const showtimeId = req.body.selectedShowtime;

  const sql = `SELECT DISTINCT M.name, Sh.movie_id FROM shown_in Sh JOIN movie M on Sh.movie_id=M.id WHERE Sh.showtime_id = ?`;

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql, [showtimeId], (err, data) => {
      if (err) return res.json(err);

      return res.json(data);
    });
  });
};

  // Lấy các phim có thể dùng để thay thế trong suất chiếu.
  const movieReplaceTo = (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  const showtimeId = req.body.selectedShowtime;

  const sql = `SELECT name, id FROM movie WHERE id NOT IN ( SELECT DISTINCT M.id FROM shown_in Sh JOIN movie M ON Sh.movie_id = M.id WHERE Sh.showtime_id = ? )`;

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql, [showtimeId], (err, data) => {
      if (err) return res.json(err);

      return res.json(data);
    });
  });
};

  // Thay phim đang được gán cho một suất chiếu.
  const movieSwap = (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  const updatedMovieId = req.body.selectedAlt;
  const showtime_id = req.body.selectedShowtime;
  const prevMovieId = req.body.selectedReplace;

  const sql = `UPDATE shown_in SET movie_id=? WHERE showtime_id=? AND movie_id=?`;

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql, [updatedMovieId, showtime_id, prevMovieId], (err, data) => {
      if (err) return res.json(err);

      return res.json(data);
    });
  });
};

  // Tổng hợp số suất, trạng thái và số vé theo ngày chiếu.
  const adminScheduleDates = async (req, res) => {
  const { email, password } = req.body;

  try {
    const isOperator = await requireOperator(email, password);
    if (!isOperator) return roleAuthFailed(res);
    const data = await queryDb(`
      SELECT
        s.showtime_date,
        COUNT(DISTINCT s.id) AS showtime_count,
        COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) AS active_showtime_count,
        COUNT(DISTINCT CASE WHEN s.status = 'cancelled' THEN s.id END) AS cancelled_showtime_count,
        COUNT(si.showtime_id) AS slot_count,
        SUM(CASE WHEN si.status = 'active' THEN 1 ELSE 0 END) AS active_slot_count,
        SUM(CASE WHEN si.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_slot_count,
        COUNT(DISTINCT t.id) AS ticket_count
      FROM showtimes s
      LEFT JOIN shown_in si ON s.id = si.showtime_id
      LEFT JOIN ticket t ON s.id = t.showtimes_id
      GROUP BY s.showtime_date
      ORDER BY s.showtime_date DESC
    `);

    return res.json(data);
  } catch (err) {
    return res.status(500).json(err);
  }
};

  // Tạo một ngày chiếu với ba suất mặc định.
  const adminScheduleDateAdd = async (req, res) => {
  const { email, password, showtimeDate } = req.body;

  if (!showtimeDate) {
    return res.status(400).json({ message: "Vui lòng chọn ngày chiếu" });
  }

  try {
    const isOperator = await requireOperator(email, password);
    if (!isOperator) return roleAuthFailed(res);

    const existing = await queryDb(
      "SELECT COUNT(*) AS dateCount FROM showtimes WHERE showtime_date = ?",
      [showtimeDate]
    );
    if (existing[0]?.dateCount > 0) {
      return res.status(400).json({ message: "Ngày chiếu này đã tồn tại" });
    }

    await queryDb(
      `INSERT INTO showtimes (movie_start_time, show_type, screen_type, showtime_date, price_per_seat)
       VALUES
       ('09:30', '2D', 'Tiêu chuẩn', ?, 120000),
       ('14:00', '2D', 'Tiêu chuẩn', ?, 120000),
       ('19:30', '3D', 'Cao cấp', ?, 180000)`,
      [showtimeDate, showtimeDate, showtimeDate]
    );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json(err);
  }
};

  // Đổi ngày của lịch chưa có vé.
  const adminScheduleDateUpdate = async (req, res) => {
  const { email, password, currentDate, nextDate } = req.body;

  if (!currentDate || !nextDate) {
    return res.status(400).json({ message: "Vui lòng chọn ngày chiếu" });
  }

  try {
    const isOperator = await requireOperator(email, password);
    if (!isOperator) return roleAuthFailed(res);

    const existing = await queryDb(
      "SELECT COUNT(*) AS dateCount FROM showtimes WHERE showtime_date = ? AND showtime_date <> ?",
      [nextDate, currentDate]
    );
    if (existing[0]?.dateCount > 0) {
      return res.status(400).json({ message: "Ngày chiếu mới đã tồn tại" });
    }

    const ticketRows = await queryDb(
      `SELECT COUNT(*) AS ticketCount
       FROM ticket t
       JOIN showtimes s ON t.showtimes_id = s.id
       WHERE s.showtime_date = ?`,
      [currentDate]
    );
    if (ticketRows[0]?.ticketCount > 0) {
      return res.status(409).json({
        message: "Không thể đổi ngày lịch chiếu đã có vé. Chỉ được ngừng bán lịch này và tạo lịch mới.",
      });
    }

    await queryDb("UPDATE showtimes SET showtime_date = ? WHERE showtime_date = ?", [
      nextDate,
      currentDate,
    ]);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json(err);
  }
};

  // Xoá lịch chưa có vé hoặc huỷ mềm lịch đã phát sinh vé.
  const adminScheduleDateDelete = async (req, res) => {
  const { email, password, showtimeDate } = req.body;

  if (!showtimeDate) {
    return res.status(400).json({ message: "Vui lòng chọn ngày chiếu" });
  }

  try {
    const isOperator = await requireOperator(email, password);
    if (!isOperator) return roleAuthFailed(res);

    const ticketRows = await queryDb(
      `SELECT COUNT(*) AS ticketCount
       FROM ticket t
       JOIN showtimes s ON t.showtimes_id = s.id
       WHERE s.showtime_date = ?`,
      [showtimeDate]
    );
    await queryDb("START TRANSACTION");
    if (ticketRows[0]?.ticketCount > 0) {
      await queryDb(
        `UPDATE shown_in si
         JOIN showtimes s ON si.showtime_id = s.id
         SET si.status = 'cancelled'
         WHERE s.showtime_date = ?`,
        [showtimeDate]
      );
      await queryDb("UPDATE showtimes SET status = 'cancelled' WHERE showtime_date = ?", [
        showtimeDate,
      ]);
      await queryDb("COMMIT");
      return res.json({ success: true, cancelled: true });
    }

    await queryDb("DELETE FROM showtimes WHERE showtime_date = ?", [showtimeDate]);
    await queryDb("COMMIT");
    return res.json({ success: true, deleted: true });
  } catch (err) {
    await queryDb("ROLLBACK").catch(() => {});
    return res.status(500).json(err);
  }
};

  // Khôi phục ngày chiếu và các lịch phim đã bị huỷ.
  const adminScheduleDateRestore = async (req, res) => {
  const { email, password, showtimeDate } = req.body;

  if (!showtimeDate) {
    return res.status(400).json({ message: "Vui lòng chọn ngày chiếu" });
  }

  try {
    const isOperator = await requireOperator(email, password);
    if (!isOperator) return roleAuthFailed(res);

    const outsideWindowRows = await queryDb(
      `SELECT COUNT(*) AS invalidCount
       FROM shown_in si
       JOIN showtimes s ON s.id = si.showtime_id
       JOIN movie m ON m.id = si.movie_id
       WHERE s.showtime_date = ?
         AND (s.showtime_date < m.release_date OR (m.end_date IS NOT NULL AND s.showtime_date > m.end_date))`,
      [showtimeDate]
    );
    if (Number(outsideWindowRows[0]?.invalidCount) > 0) {
      return res.status(409).json({
        message: "Không thể khôi phục vì có phim nằm ngoài thời gian công chiếu",
      });
    }

    await queryDb("START TRANSACTION");
    await queryDb("UPDATE showtimes SET status = 'active' WHERE showtime_date = ?", [
      showtimeDate,
    ]);
    await queryDb(
      `UPDATE shown_in si
       JOIN showtimes s ON si.showtime_id = s.id
       SET si.status = 'active'
       WHERE s.showtime_date = ?`,
      [showtimeDate]
    );
    await queryDb("COMMIT");

    return res.json({ success: true, restored: true });
  } catch (err) {
    await queryDb("ROLLBACK").catch(() => {});
    return res.status(500).json(err);
  }
};

  // Lấy dữ liệu phim, phòng và suất chiếu cho biểu mẫu quản trị.
  const adminShowtimeOptions = async (req, res) => {
  const { email, password } = req.body;

  try {
    const isOperator = await requireOperator(email, password);
    if (!isOperator) return roleAuthFailed(res);

    const [movies, halls, showtimes] = await Promise.all([
      queryDb(`
        SELECT
          id,
          name,
          DATE_FORMAT(release_date, '%Y-%m-%d') AS release_date,
          DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date,
          CASE WHEN release_date > CURDATE() THEN 'upcoming' ELSE 'showing' END AS screening_status
        FROM movie
        WHERE end_date >= CURDATE()
        ORDER BY
          CASE WHEN release_date <= CURDATE() THEN 0 ELSE 1 END,
          release_date ASC,
          name ASC
      `),
      queryDb(`
        SELECT h.id, h.name, h.theatre_id, h.screen_type,
          h.projection_capability, t.name AS theatre_name
        FROM hall h
        JOIN theatre t ON h.theatre_id = t.id
        WHERE h.status = 'active' AND t.status = 'active'
        ORDER BY t.name ASC, h.id ASC
      `),
      queryDb(`
        SELECT id, movie_start_time, show_type, screen_type, showtime_date, price_per_seat, status
        FROM showtimes
        ORDER BY showtime_date DESC, movie_start_time ASC
      `),
    ]);

    return res.json({ movies, halls, showtimes });
  } catch (err) {
    return res.status(500).json(err);
  }
};

  // Lấy chi tiết các lịch phim, có thể lọc theo ngày.
  const adminShowtimeSlots = async (req, res) => {
  const { email, password, selectedShowDate } = req.body;

  try {
    const isOperator = await requireOperator(email, password);
    if (!isOperator) return roleAuthFailed(res);

    const params = [];
    let whereSql = "";
    if (selectedShowDate) {
      whereSql = "WHERE s.showtime_date = ?";
      params.push(selectedShowDate);
    }

    const data = await queryDb(
      `
        SELECT
          si.movie_id,
          si.showtime_id,
          si.hall_id,
          m.name AS movie_name,
          h.name AS hall_name,
          h.screen_type AS hall_screen_type,
          h.projection_capability,
          th.name AS theatre_name,
          s.movie_start_time,
          s.show_type,
          s.screen_type,
          s.showtime_date,
          s.price_per_seat,
          s.status AS showtime_status,
          si.status AS slot_status,
          CASE
            WHEN TIMESTAMPADD(MINUTE, CAST(m.duration AS UNSIGNED), TIMESTAMP(s.showtime_date, s.movie_start_time)) <= NOW()
            THEN 1 ELSE 0
          END AS has_ended,
          COUNT(t.id) AS ticket_count
        FROM shown_in si
        JOIN movie m ON si.movie_id = m.id
        JOIN hall h ON si.hall_id = h.id
        JOIN theatre th ON h.theatre_id = th.id
        JOIN showtimes s ON si.showtime_id = s.id
        LEFT JOIN ticket t
          ON t.movie_id = si.movie_id
          AND t.hall_id = si.hall_id
          AND t.showtimes_id = si.showtime_id
        ${whereSql}
        GROUP BY
          si.movie_id,
          si.showtime_id,
          si.hall_id,
          m.name,
          h.name,
          h.screen_type,
          h.projection_capability,
          th.name,
          s.movie_start_time,
          s.show_type,
          s.screen_type,
          s.showtime_date,
          s.price_per_seat,
          s.status,
          si.status,
          m.duration
        ORDER BY s.showtime_date DESC, s.movie_start_time ASC, th.name ASC, h.id ASC
      `,
      params
    );

    return res.json(data);
  } catch (err) {
    return res.status(500).json(err);
  }
};

  // Tạo suất chiếu và gán phim vào phòng trong transaction.
  const adminShowtimeCreate = async (req, res) => {
  const {
    email,
    password,
    movieId,
    hallId,
    showtimeDate,
    movieStartTime,
    showType,
    screenType,
    pricePerSeat,
  } = req.body;

  if (
    !movieId ||
    !hallId ||
    !showtimeDate ||
    !movieStartTime ||
    !showType ||
    !screenType
  ) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin suất chiếu" });
  }

  let transaction;
  try {
    const isOperator = await requireOperator(email, password);
    if (!isOperator) return roleAuthFailed(res);

    transaction = await withTransaction();
    await assertMovieShowtimeDate({ movieId, showtimeDate, query: transaction.query });
    const hallSupport = await assertHallSupportsShowtime({
      hallId,
      showType,
      screenType,
      showtimeDate,
      pricePerSeat,
      query: transaction.query,
    });
    const autoPrice = Number(hallSupport.price_per_seat || pricePerSeat || 120000);

    await assertNoShowtimeOverlap({
      movieId,
      hallId,
      showtimeDate,
      movieStartTime,
      query: transaction.query,
    });
    const insertResult = await transaction.query(
      `INSERT INTO showtimes (movie_start_time, show_type, screen_type, showtime_date, price_per_seat, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [movieStartTime, showType, screenType, showtimeDate, autoPrice]
    );
    const showtimeId = insertResult.insertId;
    await transaction.query(
      "INSERT INTO shown_in (movie_id, showtime_id, hall_id, status) VALUES (?, ?, ?, 'active')",
      [movieId, showtimeId, hallId]
    );
    await transaction.commit();
    transaction.release();
    transaction = null;

    return res.json({ success: true, showtimeId });
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
      transaction.release();
    }
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Suất chiếu này đã tồn tại" });
    }
    return res.status(err.statusCode || 500).json({
      message: err.message || "Không thể tạo suất chiếu",
    });
  }
};

  // Cập nhật lịch phim nhưng bảo vệ thông tin của suất đã bán vé.
  const adminShowtimeUpdate = async (req, res) => {
  const {
    email,
    password,
    originalMovieId,
    originalHallId,
    showtimeId,
    movieId,
    hallId,
    showtimeDate,
    movieStartTime,
    showType,
    screenType,
    pricePerSeat,
  } = req.body;

  if (
    !originalMovieId ||
    !originalHallId ||
    !showtimeId ||
    !movieId ||
    !hallId ||
    !showtimeDate ||
    !movieStartTime ||
    !showType ||
    !screenType
  ) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin suất chiếu" });
  }

  let transaction;
  try {
    const isOperator = await requireOperator(email, password);
    if (!isOperator) return roleAuthFailed(res);

    transaction = await withTransaction();
    await assertMovieShowtimeDate({ movieId, showtimeDate, query: transaction.query });
    const hallSupport = await assertHallSupportsShowtime({
      hallId,
      showType,
      screenType,
      showtimeDate,
      pricePerSeat,
      query: transaction.query,
    });
    const autoPrice = Number(hallSupport.price_per_seat || pricePerSeat || 120000);

    const ticketRows = await transaction.query(
      `SELECT COUNT(*) AS ticketCount
       FROM ticket
       WHERE movie_id = ? AND hall_id = ? AND showtimes_id = ?`,
      [originalMovieId, originalHallId, showtimeId]
    );
    const changesSeatOwner =
      Number(originalMovieId) !== Number(movieId) ||
      Number(originalHallId) !== Number(hallId);
    const currentRows = await transaction.query(
      "SELECT DATE_FORMAT(showtime_date, '%Y-%m-%d') AS showtime_date, movie_start_time, show_type, screen_type, price_per_seat FROM showtimes WHERE id = ? FOR UPDATE",
      [showtimeId]
    );
    const currentShowtime = currentRows[0];
    const changesSoldSchedule =
      currentShowtime &&
      (String(currentShowtime.showtime_date).slice(0, 10) !== String(showtimeDate).slice(0, 10) ||
        String(currentShowtime.movie_start_time) !== String(movieStartTime) ||
        String(currentShowtime.show_type) !== String(showType) ||
        String(currentShowtime.screen_type) !== String(screenType));

    if (ticketRows[0]?.ticketCount > 0 && changesSeatOwner) {
      await transaction.rollback();
      transaction.release();
      transaction = null;
      return res.status(400).json({
        message: "Không thể đổi phim hoặc phòng của suất chiếu đã có vé",
      });
    }
    if (ticketRows[0]?.ticketCount > 0 && changesSoldSchedule) {
      await transaction.rollback();
      transaction.release();
      transaction = null;
      return res.status(409).json({
        message: "Không thể đổi ngày, giờ, định dạng hoặc giá của suất đã có vé. Có thể ngừng bán suất và giữ nguyên toàn bộ vé.",
      });
    }

    await assertNoShowtimeOverlap({
      movieId,
      hallId,
      showtimeDate,
      movieStartTime,
      excludeShowtimeId: showtimeId,
      query: transaction.query,
    });
    await transaction.query(
      `UPDATE showtimes
       SET movie_start_time = ?, show_type = ?, screen_type = ?, showtime_date = ?, price_per_seat = ?
       WHERE id = ?`,
      [movieStartTime, showType, screenType, showtimeDate, pricePerSeat, showtimeId]
    );
    await transaction.query(
      `UPDATE shown_in
       SET movie_id = ?, hall_id = ?
       WHERE movie_id = ? AND hall_id = ? AND showtime_id = ?`,
      [movieId, hallId, originalMovieId, originalHallId, showtimeId]
    );
    await transaction.commit();
    transaction.release();
    transaction = null;

    return res.json({ success: true });
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
      transaction.release();
    }
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Suất chiếu này đã tồn tại" });
    }
    return res.status(err.statusCode || 500).json({
      message: err.message || "Không thể cập nhật suất chiếu",
    });
  }
};

  // Chỉ xoá suất chưa bán vé; vé đã phát hành không được huỷ.
  const adminShowtimeDelete = async (req, res) => {
  const { email, password, movieId, hallId, showtimeId } = req.body;

  if (!movieId || !hallId || !showtimeId) {
    return res.status(400).json({ message: "Thiếu thông tin suất chiếu" });
  }

  let transaction;
  try {
    const isOperator = await requireOperator(email, password);
    if (!isOperator) return roleAuthFailed(res);

    transaction = await withTransaction();
    const ticketRows = await transaction.query(
      `SELECT COUNT(*) AS ticketCount
       FROM ticket
       WHERE movie_id = ? AND hall_id = ? AND showtimes_id = ? FOR UPDATE`,
      [movieId, hallId, showtimeId]
    );
    if (ticketRows[0]?.ticketCount > 0) {
      await transaction.query(
        "UPDATE shown_in SET status = 'sales_closed' WHERE movie_id = ? AND hall_id = ? AND showtime_id = ?",
        [movieId, hallId, showtimeId]
      );
      await transaction.query("UPDATE showtimes SET status = 'sales_closed' WHERE id = ?", [showtimeId]);
      await transaction.commit();
      transaction.release();
      transaction = null;
      return res.json({ success: true, stopped: true });
    }

    await transaction.query(
      "DELETE FROM shown_in WHERE movie_id = ? AND hall_id = ? AND showtime_id = ?",
      [movieId, hallId, showtimeId]
    );
    const remainingSlots = await transaction.query(
      "SELECT COUNT(*) AS slotCount FROM shown_in WHERE showtime_id = ?",
      [showtimeId]
    );
    if (remainingSlots[0]?.slotCount === 0) {
      await transaction.query("DELETE FROM showtimes WHERE id = ?", [showtimeId]);
    }
    await transaction.commit();
    transaction.release();
    transaction = null;
    return res.json({ success: true });
  } catch (err) {
    if (transaction) {
      await transaction.rollback().catch(() => {});
      transaction.release();
    }
    return res.status(err.statusCode || 500).json({ message: err.message || "Không thể xoá suất chiếu" });
  }
};

  // Khôi phục suất chiếu và lịch phim đã bị huỷ.
  const adminShowtimeRestore = async (req, res) => {
  const { email, password, movieId, hallId, showtimeId } = req.body;

  if (!movieId || !hallId || !showtimeId) {
    return res.status(400).json({ message: "Thiếu thông tin suất chiếu" });
  }

  let transaction;
  try {
    const isOperator = await requireOperator(email, password);
    if (!isOperator) return roleAuthFailed(res);

    transaction = await withTransaction();
    const showtimeRows = await transaction.query(
      "SELECT DATE_FORMAT(showtime_date, '%Y-%m-%d') AS showtime_date, movie_start_time FROM showtimes WHERE id = ? LIMIT 1 FOR UPDATE",
      [showtimeId]
    );
    if (showtimeRows.length === 0) {
      await transaction.rollback();
      transaction.release();
      transaction = null;
      return res.status(404).json({ message: "Không tìm thấy suất chiếu" });
    }
    await assertMovieShowtimeDate({
      movieId,
      showtimeDate: showtimeRows[0].showtime_date,
      query: transaction.query,
    });
    await assertNoShowtimeOverlap({
      movieId,
      hallId,
      showtimeDate: showtimeRows[0].showtime_date,
      movieStartTime: showtimeRows[0].movie_start_time,
      excludeShowtimeId: showtimeId,
      query: transaction.query,
    });

    await transaction.query("UPDATE showtimes SET status = 'active' WHERE id = ?", [
      showtimeId,
    ]);
    await transaction.query(
      "UPDATE shown_in SET status = 'active' WHERE movie_id = ? AND hall_id = ? AND showtime_id = ?",
      [movieId, hallId, showtimeId]
    );
    await transaction.commit();
    transaction.release();
    transaction = null;

    return res.json({ success: true, restored: true });
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
      transaction.release();
    }
    return res.status(err.statusCode || 500).json({
      message: err.message || "Không thể mở bán lại suất chiếu",
    });
  }
};

  // Tổng hợp hiệu suất chiếu và tỷ lệ chuyển đổi thanh toán theo từng phim.
  const adminMoviePerformance = async (req, res) => {
  const { email, password } = req.body;
  const dateFrom = req.body.dateFrom || null;
  const dateTo = req.body.dateTo || null;
  const validDate = (value) => value == null || /^\d{4}-\d{2}-\d{2}$/.test(String(value));

  if (!validDate(dateFrom) || !validDate(dateTo)) {
    return res.status(400).json({ message: "Khoảng ngày thống kê không hợp lệ" });
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return res.status(400).json({ message: "Ngày bắt đầu phải trước ngày kết thúc" });
  }

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);
    return res.json(await getMoviePerformance({ dateFrom, dateTo }));
  } catch (err) {
    console.error("Movie performance error:", err);
    return res.status(500).json({ message: "Không thể tải hiệu suất phim" });
  }
};

  // Tổng hợp các chỉ số chính cho bảng điều khiển admin.
  const adminDashboardStats = async (req, res) => {
  const { email, password } = req.body;

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const [totalRevenue, totalTickets, totalMovies, totalShowtimesToday, totalUsers, totalOrders] = await Promise.all([
      queryDb("SELECT COALESCE(SUM(amount),0) AS value FROM payment WHERE payment_status = 'PAID'"),
      queryDb("SELECT COUNT(*) AS value FROM ticket"),
      queryDb("SELECT COUNT(*) AS value FROM movie WHERE end_date IS NULL OR end_date >= CURDATE()"),
      queryDb(`SELECT COUNT(*) AS value FROM shown_in si JOIN showtimes s ON si.showtime_id = s.id WHERE s.showtime_date = CURDATE() AND si.status = 'active' AND s.status = 'active'`),
      queryDb("SELECT COUNT(*) AS value FROM person WHERE person_type = 'Customer'"),
      queryDb("SELECT COUNT(*) AS value FROM payos_orders"),
    ]);

    return res.json({
      totalRevenue: Number(totalRevenue[0]?.value || 0),
      totalTickets: Number(totalTickets[0]?.value || 0),
      totalMovies: Number(totalMovies[0]?.value || 0),
      totalShowtimesToday: Number(totalShowtimesToday[0]?.value || 0),
      totalUsers: Number(totalUsers[0]?.value || 0),
      totalOrders: Number(totalOrders[0]?.value || 0),
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return res.status(500).json({ message: "Không thể tải thống kê" });
  }
};

  // Thống kê doanh thu bán vé trong 30 ngày gần nhất.
  const adminRevenueStats = async (req, res) => {
  const { email, password } = req.body;

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const revenueByDate = await queryDb(
      `SELECT DATE(payment_time) AS date, SUM(amount) AS revenue
       FROM payment
       WHERE payment_status = 'PAID' AND payment_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(payment_time)
       ORDER BY date ASC`
    );

    return res.json(revenueByDate);
  } catch (err) {
    console.error("Revenue stats error:", err);
    return res.status(500).json({ message: "Không thể tải doanh thu" });
  }
};

  // Thống kê số đơn theo nhóm trạng thái thanh toán.
  const adminOrderStatusStats = async (req, res) => {
  const { email, password } = req.body;

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);
    await expireStaleOrders();

    const statusStats = await queryDb(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END), 0) AS paid,
        COALESCE(SUM(CASE WHEN status IN ('UNPAID','PENDING') THEN 1 ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN status IN ('FAILED','EXPIRED') THEN 1 ELSE 0 END), 0) AS failed
       FROM payos_orders`
    );

    const row = statusStats[0] || { paid: 0, pending: 0, failed: 0 };
    return res.json([
      { name: "Đã thanh toán", value: Number(row.paid) },
      { name: "Chờ thanh toán", value: Number(row.pending) },
      { name: "Lỗi hoặc hết hạn", value: Number(row.failed) },
    ]);
  } catch (err) {
    console.error("Order status stats error:", err);
    return res.status(500).json({ message: "Không thể tải trạng thái đơn" });
  }
};

  // Thống kê lượt đặt vé theo buổi chiếu trong ngày.
  const adminBookingTimeStats = async (req, res) => {
  const { email, password } = req.body;

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);
    const timeStats = await queryDb(
      `SELECT
        CASE
          WHEN TIME(s.movie_start_time) >= '06:00' AND TIME(s.movie_start_time) < '12:00' THEN 'Sáng (6h-12h)'
          WHEN TIME(s.movie_start_time) >= '12:00' AND TIME(s.movie_start_time) < '18:00' THEN 'Chiều (12h-18h)'
          ELSE 'Tối (18h-24h)'
        END AS time_slot,
        COUNT(t.id) AS bookings
       FROM ticket t
       JOIN showtimes s ON t.showtimes_id = s.id
       GROUP BY time_slot
       ORDER BY time_slot`
    );

    return res.json(timeStats.map(r => ({ time: r.time_slot, bookings: Number(r.bookings) })));
  } catch (err) {
    console.error("Booking time stats error:", err);
    return res.status(500).json({ message: "Không thể tải thống kê giờ chiếu" });
  }
};

  // Lấy mười đơn hàng mới nhất cho dashboard.
  const adminRecentOrders = async (req, res) => {
  const { email, password } = req.body;

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);
    await expireStaleOrders();

    const rows = await queryDb(
      `SELECT
        PO.order_code,
        PO.status,
        PO.amount,
        PO.customer_email,
        PO.payment_method,
        PO.payment_id,
        PO.ticket_ids_json,
        PO.payload_json,
        PO.error_message,
        PO.expires_at,
        PO.created_at
       FROM payos_orders PO
       ORDER BY PO.created_at DESC
       LIMIT 10`
    );

    const orders = rows.map(toAdminOrder);
    return res.json(orders);
  } catch (err) {
    console.error("Recent orders error:", err);
    return res.status(500).json({ message: "Không thể tải đơn gần đây" });
  }
};

  // Xếp hạng phim theo số vé đã bán.
  const adminTopMovies = async (req, res) => {
  const { email, password } = req.body;

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const topMovies = await queryDb(
      `SELECT M.id, M.name, M.image_path, M.rating, COUNT(T.id) AS tickets_sold
       FROM movie M
       LEFT JOIN ticket T ON M.id = T.movie_id
       GROUP BY M.id, M.name, M.image_path, M.rating
       ORDER BY tickets_sold DESC
       LIMIT 10`
    );

    return res.json(topMovies.map(r => ({
      id: r.id,
      name: r.name,
      image_path: r.image_path,
      rating: Number(r.rating),
      tickets_sold: Number(r.tickets_sold),
    })));
  } catch (err) {
    console.error("Top movies error:", err);
    return res.status(500).json({ message: "Không thể tải top phim" });
  }
};

  // Kiểm tra quyền và tải ảnh phim hoặc combo lên Cloudflare R2.
  const adminUploadImage = async (req, res) => {
  try {
    const { email, password } = req.body;

    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn ảnh" });
    }

    const folder = req.body.folder === "combos" ? "combos" : "movies";
    const fileName = generateFileName(req.file.originalname);
    const uploadedImage = await uploadToR2({
      buffer: req.file.buffer,
      fileName,
      mimeType: req.file.mimetype,
      folder,
    });

    return res.json({ ...uploadedImage, fileName });
  } catch (err) {
    console.error("Upload image error:", err);
    return res.status(500).json({ message: "Không thể tải ảnh lên" });
  }
};

  const adminMediaDelete = async (req, res) => {
    try {
      const mediaUrl = String(req.body.mediaUrl || "");
      if (!mediaUrl.startsWith("/media/")) return res.status(400).json({ message: "Đường dẫn ảnh không hợp lệ" });
      await deleteFromR2(mediaUrl);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ message: err.message || "Không thể xoá ảnh" });
    }
  };

  const adminTicketPriceConfigs = async (req, res) => {
    const { email, password } = req.body;
    try {
      const isOperator = await requireOperator(email, password);
      if (!isOperator) return roleAuthFailed(res);

      const configs = await queryDb(
        "SELECT id, room_type, show_type, day_type, seat_type, price FROM ticket_price_config ORDER BY room_type, show_type, day_type, seat_type"
      );
      return res.json(configs);
    } catch (err) {
      return res.status(500).json({ message: err.message || "Không thể tải cấu hình giá vé" });
    }
  };

  const adminTicketPriceConfigUpdate = async (req, res) => {
    const { email, password, configs } = req.body;
    try {
      const isOperator = await requireOperator(email, password);
      if (!isOperator) return roleAuthFailed(res);

      if (!Array.isArray(configs) || configs.length === 0) {
        return res.status(400).json({ message: "Dữ liệu cấu hình không hợp lệ" });
      }

      for (const item of configs) {
        const { id, price, room_type, show_type, day_type, seat_type } = item;
        const numPrice = Number(price);
        if (!numPrice || numPrice <= 0) continue;

        if (id) {
          await queryDb(
            "UPDATE ticket_price_config SET price = ? WHERE id = ?",
            [numPrice, Number(id)]
          );
        } else if (room_type && show_type && day_type && seat_type) {
          await queryDb(
            `INSERT INTO ticket_price_config (room_type, show_type, day_type, seat_type, price)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE price = VALUES(price)`,
            [room_type, show_type, day_type, seat_type, numPrice]
          );
        }
      }

      return res.json({ success: true, message: "Cập nhật cấu hình giá vé thành công" });
    } catch (err) {
      return res.status(500).json({ message: err.message || "Không thể cập nhật cấu hình giá vé" });
    }
  };

  return {
    adminOrders,
    adminOrderStatusUpdate,
    adminOrderFulfillmentUpdate,
    adminTicketCheckIn,
    adminMovies,
    adminMovieUpdate,
    adminMovieDelete,
    adminMovieAdd,
    totalTickets,
    totalPayment,
    totalCustomers,
    totalTicketPerMovie,
    adminShowtimeOptions,
    adminShowtimeSlots,
    adminShowtimeCreate,
    adminShowtimeUpdate,
    adminShowtimeDelete,
    adminShowtimeRestore,
    adminMoviePerformance,
    adminDashboardStats,
    adminRevenueStats,
    adminOrderStatusStats,
    adminBookingTimeStats,
    adminRecentOrders,
    adminTopMovies,
    adminUploadImage,
    adminMediaDelete,
    adminTicketPriceConfigs,
    adminTicketPriceConfigUpdate,
  };
};

module.exports = createAdminController;
