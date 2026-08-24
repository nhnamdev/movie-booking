// Cung cấp dữ liệu phim, rạp và suất chiếu công khai.
const createCatalogController = (dependencies) => {
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

  // Kiểm tra nhanh trạng thái phản hồi của backend.
  const health = (req, res) => {
  return res.json("Hello Backend Side");
};

  // Lấy sáu phim mới nhất kèm thể loại.
  const latestMovies = (req, res) => {
  const sql =
    "SELECT m.id, MAX(m.name) AS name, MAX(m.image_path) AS image_path, MAX(m.rating) AS rating, MAX(m.duration) AS duration, MAX(m.release_date) AS release_date, MAX(m.end_date) AS end_date, 'showing' AS screening_status, GROUP_CONCAT(g.genre SEPARATOR ', ') AS genres FROM movie m INNER JOIN movie_genre g ON m.id = g.movie_id WHERE m.release_date <= CURDATE() AND m.end_date >= CURDATE() GROUP BY m.id ORDER BY MAX(m.release_date) DESC LIMIT 6";

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  // Lấy phim chưa phát hành và cho biết phim nào đã có suất mở bán trước.
  const upcomingMovies = (req, res) => {
  const sql = `
    SELECT
      m.id,
      MAX(m.name) AS name,
      MAX(m.image_path) AS image_path,
      MAX(m.rating) AS rating,
      MAX(m.duration) AS duration,
      MAX(m.release_date) AS release_date,
      MAX(m.end_date) AS end_date,
      'upcoming' AS screening_status,
      GROUP_CONCAT(DISTINCT g.genre ORDER BY g.genre SEPARATOR ', ') AS genres,
      EXISTS (
        SELECT 1
        FROM shown_in si
        JOIN showtimes s ON s.id = si.showtime_id
        JOIN hall h ON h.id = si.hall_id
        JOIN theatre t ON t.id = h.theatre_id
        WHERE si.movie_id = m.id
          AND si.status = 'active'
          AND s.status = 'active'
          AND h.status = 'active'
          AND t.status = 'active'
          AND s.showtime_date BETWEEN m.release_date AND m.end_date
          AND TIMESTAMPADD(MINUTE, CAST(m.duration AS UNSIGNED), TIMESTAMP(s.showtime_date, s.movie_start_time)) > NOW()
      ) AS has_bookable_showtime
    FROM movie m
    INNER JOIN movie_genre g ON g.movie_id = m.id
    WHERE m.release_date > CURDATE()
      AND m.end_date >= m.release_date
    GROUP BY m.id
    ORDER BY MAX(m.release_date) ASC, MAX(m.name) ASC
    LIMIT 6
  `;

  db.query(sql, (err, data) => {
    if (err) return res.status(500).json({ message: "Không thể tải phim sắp chiếu" });
    return res.json(data);
  });
};

  // Lấy thông tin mô tả địa điểm của các rạp.
  const locationDetails = (req, res) => {
  const sql = "SELECT location_details FROM theatre WHERE status = 'active'";

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  // Lấy các tiện ích nổi bật tại rạp.
  const locationFeatures = (req, res) => {
  const sql = "SELECT DISTINCT title,image_path,description FROM features";

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  // Lấy danh sách rạp và địa chỉ.
  const theatres = (req, res) => {
  const sql = "SELECT id, name, location, location_details FROM theatre WHERE status = 'active' ORDER BY name";

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  // Lọc lịch chiếu đang hoạt động theo rạp và thể loại.
  const showtimes = (req, res) => {
  const theatreName = req.body.theatreName;
  const userGenre = req.body.userGenre;

  const baseSql = `
    SELECT
      M.id,
      M.name AS movie_name,
      M.image_path,
      M.language,
      M.duration,
      M.release_date,
      M.audio_type,
      M.age_rating,
      S.id AS showtime_id,
      H.id AS hall_id,
      H.name AS hall_name,
      DATE_FORMAT(S.showtime_date, '%Y-%m-%d') AS showtime_date,
      S.movie_start_time,
      S.show_type,
      S.screen_type,
      S.price_per_seat,
      MG.genre
    FROM theatre T
    JOIN hall H ON T.id = H.theatre_id
    JOIN shown_in SI ON H.id = SI.hall_id
    JOIN showtimes S ON SI.showtime_id = S.id
    JOIN movie M ON SI.movie_id = M.id
    JOIN movie_genre MG ON MG.movie_id = M.id
    JOIN (
      SELECT s2.showtime_date
      FROM showtimes s2
      JOIN shown_in si2 ON s2.id = si2.showtime_id
      JOIN movie m2 ON m2.id = si2.movie_id
      JOIN hall h2 ON h2.id = si2.hall_id
      JOIN theatre t2 ON t2.id = h2.theatre_id
      WHERE s2.status = 'active' AND si2.status = 'active'
        AND t2.name = ? AND t2.status = 'active' AND h2.status = 'active'
        AND (m2.end_date IS NULL OR m2.end_date >= CURDATE())
        AND TIMESTAMPADD(MINUTE, CAST(m2.duration AS UNSIGNED), TIMESTAMP(s2.showtime_date, s2.movie_start_time)) > NOW()
      GROUP BY s2.showtime_date
      ORDER BY s2.showtime_date ASC
      LIMIT 4
    ) AS LatestDates ON S.showtime_date = LatestDates.showtime_date
    WHERE T.name = ?
      AND T.status = 'active'
      AND H.status = 'active'
      AND S.status = 'active'
      AND SI.status = 'active'
      AND (M.end_date IS NULL OR M.end_date >= CURDATE())
      AND TIMESTAMPADD(MINUTE, CAST(M.duration AS UNSIGNED), TIMESTAMP(S.showtime_date, S.movie_start_time)) > NOW()
  `;

  const sql1 = `${baseSql} AND MG.genre = ? ORDER BY S.showtime_date ASC, S.movie_start_time ASC, M.name ASC`;
  const sql2 = `${baseSql} ORDER BY S.showtime_date ASC, S.movie_start_time ASC, M.name ASC`;

  userGenre === "All"
    ? db.query(sql2, [theatreName, theatreName], (err, data) => {
        if (err) {
          return res.json({ error: "An error occurred while fetching data." });
        }

        return res.json(data);
      })
    : db.query(sql1, [theatreName, theatreName, userGenre], (err, data) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ error: "An error occurred while fetching data." });
        }

        return res.json(data);
      });
};

  // Lấy danh sách thể loại phim không trùng lặp.
  const genres = (req, res) => {
  const sql = "SELECT DISTINCT genre FROM movie_genre";

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  // Lấy chi tiết phim kèm đạo diễn, thể loại, tổng số review và rating trung bình.
  const movieDetail = (req, res) => {
    const id = req.body.movieDetailsId;

    const sql = `SELECT
  M.*,
  (SELECT COUNT(*) FROM movie_review WHERE movie_id = M.id) AS total_reviews,
  COALESCE(
    (SELECT ROUND(AVG(rating), 1) FROM movie_review WHERE movie_id = M.id),
    M.rating
  ) AS calculated_rating,
  GROUP_CONCAT(DISTINCT MD.director SEPARATOR ', ') AS directors,
  GROUP_CONCAT(DISTINCT MG.genre SEPARATOR ', ') AS genres
FROM
  movie M
 LEFT JOIN
  movie_directors MD ON M.id = MD.movie_id
 LEFT JOIN
  movie_genre MG ON M.id = MG.movie_id
WHERE
  M.id = ?
GROUP BY
  M.id
`;

    db.query(sql, [id], (err, data) => {
      if (err) return res.json(err);
      if (Array.isArray(data) && data.length > 0 && data[0].calculated_rating !== undefined) {
        data[0].rating = data[0].calculated_rating;
      }
      return res.json(data);
    });
  };

  // Lấy danh sách đánh giá, điểm trung bình và phân bổ số sao của phim.
  const getMovieReviews = async (req, res) => {
    const parsedMovieId = Number(req.params.movieId || req.query.movieId || req.body.movieId) || 0;
    try {
      if (!parsedMovieId) {
        return res.status(400).json({ message: "Mã phim không hợp lệ" });
      }

      const currentUserEmail = req.user?.email || null;

      // Đảm bảo bảng movie_review tồn tại
      await queryDbAsync(
        `CREATE TABLE IF NOT EXISTS movie_review (
          id INT NOT NULL AUTO_INCREMENT,
          movie_id INT NOT NULL,
          customer_email VARCHAR(100) NOT NULL,
          rating DECIMAL(3,1) NOT NULL,
          comment TEXT DEFAULT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY movie_review_user_unique (movie_id, customer_email),
          KEY movie_review_movie_idx (movie_id),
          KEY movie_review_customer_idx (customer_email),
          CONSTRAINT movie_review_movie_fk FOREIGN KEY (movie_id) REFERENCES movie(id) ON DELETE CASCADE,
          CONSTRAINT movie_review_customer_fk FOREIGN KEY (customer_email) REFERENCES person(email) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
      ).catch(() => {});

      // 1. Thống kê tổng thể
      const statsRows = await queryDbAsync(
        `SELECT 
           COUNT(*) AS total_reviews,
           COALESCE(ROUND(AVG(rating), 1), 0) AS average_rating
         FROM movie_review
         WHERE movie_id = ?`,
        [parsedMovieId]
      );
      const stats = statsRows && statsRows[0] ? statsRows[0] : { total_reviews: 0, average_rating: 0 };

      // 2. Phân bổ sao (1-5 sao)
      const breakdownRows = await queryDbAsync(
        `SELECT 
           CASE 
             WHEN rating >= 9.0 THEN 5
             WHEN rating >= 7.0 THEN 4
             WHEN rating >= 5.0 THEN 3
             WHEN rating >= 3.0 THEN 2
             ELSE 1
           END AS star_level,
           COUNT(*) AS count
         FROM movie_review
         WHERE movie_id = ?
         GROUP BY star_level`,
        [parsedMovieId]
      );

      const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      if (Array.isArray(breakdownRows)) {
        breakdownRows.forEach((row) => {
          ratingBreakdown[row.star_level] = Number(row.count);
        });
      }

      // 3. Danh sách reviews kèm huy hiệu đã mua vé
      const reviews = await queryDbAsync(
        `SELECT 
           R.id,
           R.movie_id,
           R.customer_email,
           R.rating,
           R.comment,
           R.created_at,
           R.updated_at,
           COALESCE(NULLIF(CONCAT(COALESCE(P.first_name, ''), ' ', COALESCE(P.last_name, '')), ' '), P.email) AS customer_name,
           EXISTS (
             SELECT 1 FROM ticket T
             JOIN payment PM ON PM.id = T.payment_id
             WHERE T.movie_id = R.movie_id 
               AND PM.customer_email = R.customer_email 
               AND T.ticket_status IN ('ISSUED', 'CHECKED_IN')
           ) AS is_verified_viewer
         FROM movie_review R
         LEFT JOIN person P ON P.email = R.customer_email
         WHERE R.movie_id = ?
         ORDER BY (R.customer_email = ?) DESC, R.created_at DESC`,
        [parsedMovieId, currentUserEmail || ""]
      );

      let userReview = null;
      let hasPurchased = false;

      if (currentUserEmail) {
        userReview = Array.isArray(reviews) ? reviews.find((r) => r.customer_email === currentUserEmail) || null : null;
        const ticketCheck = await queryDbAsync(
          `SELECT 1 FROM ticket T
           JOIN payment PM ON PM.id = T.payment_id
           WHERE T.movie_id = ? AND PM.customer_email = ? AND T.ticket_status IN ('ISSUED', 'CHECKED_IN')
           LIMIT 1`,
          [parsedMovieId, currentUserEmail]
        );
        hasPurchased = Array.isArray(ticketCheck) && ticketCheck.length > 0;
      }

      const formattedReviews = Array.isArray(reviews)
        ? reviews.map((r) => {
            const email = r.customer_email;
            const maskedEmail = email
              ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(Math.max(b.length, 3)) + c)
              : "Khán giả CGV";
            return {
              id: r.id,
              movie_id: r.movie_id,
              customer_name: r.customer_name?.trim() || maskedEmail,
              customer_email: r.customer_email,
              is_own_review: currentUserEmail === r.customer_email,
              rating: Number(r.rating),
              comment: r.comment,
              created_at: r.created_at,
              updated_at: r.updated_at,
              is_verified_viewer: Boolean(r.is_verified_viewer),
            };
          })
        : [];

      return res.json({
        movie_id: parsedMovieId,
        total_reviews: Number(stats.total_reviews || 0),
        average_rating: Number(stats.average_rating || 0),
        rating_breakdown: ratingBreakdown,
        user_review: userReview,
        has_purchased: hasPurchased,
        reviews: formattedReviews,
      });
    } catch (err) {
      console.error("Get movie reviews error:", err);
      return res.json({
        movie_id: parsedMovieId,
        total_reviews: 0,
        average_rating: 0,
        rating_breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        user_review: null,
        has_purchased: false,
        reviews: [],
      });
    }
  };

  // Lấy bảng giá vé cấu hình công khai từ database
  const getTicketPriceConfigs = async (req, res) => {
    try {
      const rows = await queryDbAsync(
        `SELECT id, room_type, show_type, day_type, seat_type, price
         FROM ticket_price_config
         ORDER BY 
           CASE room_type WHEN 'Tiêu chuẩn' THEN 1 ELSE 2 END,
           CASE show_type WHEN '2D' THEN 1 ELSE 2 END,
           CASE day_type WHEN 'WEEKDAY' THEN 1 ELSE 2 END,
           CASE seat_type WHEN 'STANDARD' THEN 1 ELSE 2 END`
      );
      return res.json(rows || []);
    } catch (err) {
      console.error("Get ticket price configs error:", err);
      return res.status(500).json({ message: "Không thể lấy cấu hình giá vé" });
    }
  };

  // Kích hoạt seed dữ liệu CGV và lịch chiếu đến 10/09/2026
  const triggerSeedCgvShowtimes = async (req, res) => {
    try {
      const mysqlPromise = require("mysql2/promise");
      const promiseConn = await mysqlPromise.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        charset: "utf8mb4",
        timezone: process.env.DB_TIMEZONE || "+07:00",
      });
      try {
        const { seedCgvData } = require("../scripts/seedCgvSeptember2026");
        await promiseConn.query("SET time_zone = ?", [process.env.DB_SESSION_TIMEZONE || "+07:00"]);
        await promiseConn.beginTransaction();
        const result = await seedCgvData(promiseConn);
        await promiseConn.commit();
        return res.json({
          success: true,
          message: `Đã khởi tạo thành công ${result.totalShowtimesCount} suất chiếu cho ${result.moviesCount} phim đến 10/09/2026!`,
        });
      } catch (seedErr) {
        await promiseConn.rollback();
        throw seedErr;
      } finally {
        await promiseConn.end();
      }
    } catch (err) {
      console.error("Trigger seed error:", err);
      return res.status(500).json({ message: err.message || "Lỗi khi seed dữ liệu" });
    }
  };

  // Thêm hoặc cập nhật đánh giá phim từ người dùng.
  const addOrUpdateMovieReview = async (req, res) => {
    try {
      const user = req.user;
      if (!user || !user.email) {
        return res.status(401).json({ message: "Vui lòng đăng nhập để gửi đánh giá" });
      }

      const { movieId, rating, comment } = req.body;
      const parsedMovieId = Number(movieId);
      const parsedRating = Number(rating);

      if (!parsedMovieId || isNaN(parsedMovieId)) {
        return res.status(400).json({ message: "Mã phim không hợp lệ" });
      }

      if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 10) {
        return res.status(400).json({ message: "Điểm đánh giá phải từ 1 đến 10 sao (hoặc 1 - 10 điểm)" });
      }

      const [movie] = await queryDbAsync("SELECT id FROM movie WHERE id = ?", [parsedMovieId]);
      if (!movie) {
        return res.status(404).json({ message: "Không tìm thấy phim yêu cầu" });
      }

      await queryDbAsync(
        `INSERT INTO movie_review (movie_id, customer_email, rating, comment)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), updated_at = CURRENT_TIMESTAMP`,
        [parsedMovieId, user.email, parsedRating, (comment || "").trim()]
      );

      await queryDbAsync(
        `UPDATE movie
         SET rating = (
           SELECT ROUND(AVG(rating), 1)
           FROM movie_review
           WHERE movie_id = ?
         )
         WHERE id = ?`,
        [parsedMovieId, parsedMovieId]
      );

      const [newStats] = await queryDbAsync(
        `SELECT 
           COUNT(*) AS total_reviews,
           COALESCE(ROUND(AVG(rating), 1), 0) AS average_rating
         FROM movie_review
         WHERE movie_id = ?`,
        [parsedMovieId]
      );

      return res.json({
        success: true,
        message: "Cảm ơn bạn đã gửi đánh giá cho bộ phim!",
        total_reviews: Number(newStats?.total_reviews || 0),
        average_rating: Number(newStats?.average_rating || 0),
      });
    } catch (err) {
      console.error("Save movie review error:", err);
      return res.status(500).json({ message: "Không thể lưu đánh giá phim" });
    }
  };

  // Xóa đánh giá phim (khách hàng xóa đánh giá của mình hoặc Quản trị viên xóa).
  const deleteMovieReview = async (req, res) => {
    try {
      const user = req.user;
      if (!user || !user.email) {
        return res.status(401).json({ message: "Vui lòng đăng nhập" });
      }

      const reviewId = Number(req.params.reviewId || req.body.reviewId);
      const movieId = Number(req.params.movieId || req.body.movieId);

      let targetReview = null;
      if (reviewId) {
        const [r] = await queryDbAsync("SELECT id, movie_id, customer_email FROM movie_review WHERE id = ?", [reviewId]);
        targetReview = r;
      } else if (movieId) {
        const [r] = await queryDbAsync("SELECT id, movie_id, customer_email FROM movie_review WHERE movie_id = ? AND customer_email = ?", [movieId, user.email]);
        targetReview = r;
      }

      if (!targetReview) {
        return res.status(404).json({ message: "Không tìm thấy đánh giá để xóa" });
      }

      if (targetReview.customer_email !== user.email && user.person_type !== "Admin") {
        return res.status(403).json({ message: "Bạn không có quyền xóa đánh giá này" });
      }

      await queryDbAsync("DELETE FROM movie_review WHERE id = ?", [targetReview.id]);

      await queryDbAsync(
        `UPDATE movie
         SET rating = (
           SELECT ROUND(AVG(rating), 1)
           FROM movie_review
           WHERE movie_id = ?
         )
         WHERE id = ?`,
        [targetReview.movie_id, targetReview.movie_id]
      );

      const [newStats] = await queryDbAsync(
        `SELECT 
           COUNT(*) AS total_reviews,
           COALESCE(ROUND(AVG(rating), 1), 0) AS average_rating
         FROM movie_review
         WHERE movie_id = ?`,
        [targetReview.movie_id]
      );

      return res.json({
        success: true,
        message: "Đã xóa đánh giá thành công",
        total_reviews: Number(newStats?.total_reviews || 0),
        average_rating: Number(newStats?.average_rating || 0),
      });
    } catch (err) {
      console.error("Delete movie review error:", err);
      return res.status(500).json({ message: "Không thể xóa đánh giá" });
    }
  };

  // Lấy các suất chiếu của một phim tại rạp đã chọn.
  const movieWiseShowtime = (req, res) => {
  const movieId = req.body.movieDetailsId;
  const theatreId = req.body.theatreId;

  const sql = `SELECT S.id AS showtime_id, H.id AS hall_id, M.id AS movie_id, DATE_FORMAT(S.showtime_date, '%Y-%m-%d') AS showtime_date, S.movie_start_time, S.show_type, S.price_per_seat FROM theatre T JOIN hall H ON T.id = H.theatre_id JOIN shown_in SI ON H.id = SI.hall_id JOIN showtimes S ON SI.showtime_id = S.id JOIN movie M ON SI.movie_id = M.id JOIN ( SELECT s2.showtime_date FROM showtimes s2 JOIN shown_in si2 ON s2.id = si2.showtime_id JOIN movie m2 ON m2.id = si2.movie_id JOIN hall h2 ON h2.id = si2.hall_id WHERE h2.theatre_id = ? AND si2.movie_id = ? AND s2.status = 'active' AND si2.status = 'active' AND (m2.end_date IS NULL OR m2.end_date >= CURDATE()) AND TIMESTAMPADD(MINUTE, CAST(m2.duration AS UNSIGNED), TIMESTAMP(s2.showtime_date, s2.movie_start_time)) > NOW() GROUP BY s2.showtime_date ORDER BY s2.showtime_date ASC LIMIT 4 ) AS LatestDates ON S.showtime_date = LatestDates.showtime_date WHERE T.id = ? AND M.id = ? AND T.status = 'active' AND H.status = 'active' AND S.status = 'active' AND SI.status = 'active' AND (M.end_date IS NULL OR M.end_date >= CURDATE()) AND TIMESTAMPADD(MINUTE, CAST(M.duration AS UNSIGNED), TIMESTAMP(S.showtime_date, S.movie_start_time)) > NOW() ORDER BY S.showtime_date ASC, S.movie_start_time ASC`;

  db.query(sql, [theatreId, movieId, theatreId, movieId], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  // Lấy các phim khác để hiển thị nội dung liên quan.
  const otherMovies = (req, res) => {
  const movieId = req.body.movieDetailsId;

  const sql =
    "SELECT m.id, m.name, m.image_path, m.rating, m.duration, m.release_date as release_date, m.end_date, GROUP_CONCAT(g.genre SEPARATOR ', ') as genres FROM movie m INNER JOIN movie_genre g ON m.id = g.movie_id WHERE m.end_date IS NULL OR m.end_date >= CURDATE() GROUP BY m.id HAVING m.id!=?";

  db.query(sql, [movieId], (err, data) => {
    if (err) return res.json(err);

    return res.status(200).json(data);
  });
};

  return {
    health,
    latestMovies,
    upcomingMovies,
    locationDetails,
    locationFeatures,
    theatres,
    showtimes,
    genres,
    movieDetail,
    movieWiseShowtime,
    otherMovies,
    getMovieReviews,
    addOrUpdateMovieReview,
    deleteMovieReview,
    getTicketPriceConfigs,
    triggerSeedCgvShowtimes,
  };
};

module.exports = createCatalogController;
