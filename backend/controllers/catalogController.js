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
    "SELECT m.id, m.name, m.image_path, m.rating, m.duration, m.release_date, m.end_date, 'showing' AS screening_status, GROUP_CONCAT(g.genre SEPARATOR ', ') AS genres FROM movie m INNER JOIN movie_genre g ON m.id = g.movie_id WHERE m.release_date <= CURDATE() AND m.end_date >= CURDATE() GROUP BY m.id ORDER BY m.release_date DESC LIMIT 6";

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
      m.name,
      m.image_path,
      m.rating,
      m.duration,
      m.release_date,
      m.end_date,
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
    ORDER BY m.release_date ASC, m.name ASC
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

  // Lấy chi tiết phim kèm đạo diễn và thể loại.
  const movieDetail = (req, res) => {
  const id = req.body.movieDetailsId;

  const sql = `SELECT
  M.*,
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

    return res.json(data);
  });
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
  };
};

module.exports = createCatalogController;
