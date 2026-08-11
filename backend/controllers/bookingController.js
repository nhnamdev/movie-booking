// Cung cấp dữ liệu theo từng bước của quy trình đặt vé.
const createBookingController = (dependencies) => {
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
    getMovieCombos,
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

  // Lấy các ngày chiếu đang mở bán tại rạp đã chọn.
  const showtimesDates = (req, res) => {
  const theatreId = req.body.theatreId;

  const sql = `SELECT DATE_FORMAT(subquery.showtime_date, '%Y-%m-%d') AS showtime_date
  FROM (
      SELECT showtimes.showtime_date
      FROM showtimes
      JOIN shown_in ON showtimes.id = shown_in.showtime_id
      JOIN movie ON movie.id = shown_in.movie_id
      JOIN hall ON shown_in.hall_id = hall.id
      WHERE hall.theatre_id = ?
        AND hall.status = 'active'
        AND showtimes.status = 'active'
        AND shown_in.status = 'active'
        AND (movie.end_date IS NULL OR movie.end_date >= CURDATE())
        AND TIMESTAMPADD(MINUTE, CAST(movie.duration AS UNSIGNED), TIMESTAMP(showtimes.showtime_date, showtimes.movie_start_time)) > NOW()
      GROUP BY showtimes.showtime_date
      ORDER BY showtimes.showtime_date ASC
      LIMIT 4
  ) AS subquery
  ORDER BY subquery.showtime_date ASC`;

  db.query(sql, [theatreId], (err, data) => {
    if (err) return res.status(500).json({ message: "Could not load showtime dates" });

    return res.json(data);
  });
};

  // Lấy danh sách phim theo rạp và ngày chiếu.
  const uniqueMovies = (req, res) => {
  const theatreId = req.body.theatreId;
  const showtimeDate = req.body.userDate;

  const sql =
    "SELECT DISTINCT M.id,M.duration, M.name AS movie_name, M.image_path FROM movie M JOIN shown_in SI ON M.id = SI.movie_id JOIN showtimes S ON SI.showtime_id = S.id JOIN hall H ON SI.hall_id = H.id JOIN theatre T ON T.id = H.theatre_id WHERE H.theatre_id = ? AND S.showtime_date = ? AND T.status = 'active' AND H.status = 'active' AND S.status = 'active' AND SI.status = 'active' AND (M.end_date IS NULL OR M.end_date >= CURDATE()) AND TIMESTAMPADD(MINUTE, CAST(M.duration AS UNSIGNED), TIMESTAMP(S.showtime_date, S.movie_start_time)) > NOW()";

  db.query(sql, [theatreId, showtimeDate], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  // Lấy phòng và suất chiếu phù hợp với phim đã chọn.
  const halls = (req, res) => {
  const theatreId = req.body.theatreId;
  const showtimeDate = req.body.userDate;
  const movieId = req.body.userMovieId;

  const sql =
    "SELECT H.id AS hall_id, H.name AS hall_name, SI.showtime_id, S.show_type, S.screen_type, S.movie_start_time, S.price_per_seat FROM hall H JOIN theatre T ON T.id = H.theatre_id JOIN shown_in SI ON H.id = SI.hall_id JOIN showtimes S ON SI.showtime_id = S.id JOIN movie M ON M.id = SI.movie_id WHERE H.theatre_id = ? AND S.showtime_date = ? AND SI.movie_id = ? AND T.status = 'active' AND H.status = 'active' AND S.status = 'active' AND SI.status = 'active' AND (M.end_date IS NULL OR M.end_date >= CURDATE()) AND TIMESTAMPADD(MINUTE, CAST(M.duration AS UNSIGNED), TIMESTAMP(S.showtime_date, S.movie_start_time)) > NOW()";
  db.query(sql, [theatreId, showtimeDate, movieId], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  // Trả trạng thái ghế, gồm ghế đã bán và ghế đang được giữ.
  const seats = async (req, res) => {
  const showtime_id = Number(req.body.userShowtimeId);
  const hall_id = Number(req.body.userHallId);
  const movie_id = Number(req.body.userMovieId);

  const sql = `SELECT
  S.id AS seat_id,
  COALESCE(HS.seat_label, S.name) AS seat_name,
  HS.row_index,
  HS.column_index,
  HS.seat_type,
  HS.price_surcharge,
  COALESCE(
    TPC.price,
    STIME.price_per_seat + HS.price_surcharge
  ) AS final_price,
  CASE WHEN T.id IS NULL THEN TRUE ELSE FALSE END AS booked_status
FROM
  seat AS S
  JOIN hallwise_seat AS HS ON S.id = HS.seat_id
  JOIN hall AS H ON H.id = HS.hall_id
  JOIN theatre AS TH ON TH.id = H.theatre_id
  JOIN shown_in AS SI ON HS.hall_id = SI.hall_id
  JOIN showtimes AS STIME ON SI.showtime_id = STIME.id
  JOIN movie AS M ON M.id = SI.movie_id
  LEFT JOIN ticket_price_config AS TPC ON
      TPC.room_type = H.screen_type AND
      TPC.show_type = STIME.show_type AND
      TPC.day_type = CASE WHEN DAYOFWEEK(STIME.showtime_date) IN (1, 6, 7) THEN 'WEEKEND' ELSE 'WEEKDAY' END AND
      TPC.seat_type = HS.seat_type
  LEFT JOIN ticket AS T ON
      T.seat_id = S.id AND
      T.showtimes_id = SI.showtime_id AND
      T.hall_id = SI.hall_id AND
      T.movie_id = SI.movie_id AND
      EXISTS (
        SELECT 1 FROM payment TP
        WHERE TP.id = T.payment_id
          AND TP.payment_status <> 'EXPIRED'
      )
WHERE
  SI.showtime_id = ? AND
  SI.hall_id = ? AND
  SI.movie_id = ? AND
  HS.is_active = 1 AND
  H.status = 'active' AND
  TH.status = 'active' AND
  SI.status = 'active' AND
  STIME.status = 'active' AND
  (M.end_date IS NULL OR M.end_date >= CURDATE()) AND
  TIMESTAMPADD(MINUTE, CAST(M.duration AS UNSIGNED), TIMESTAMP(STIME.showtime_date, STIME.movie_start_time)) > NOW()
ORDER BY HS.row_index, HS.column_index`;

  try {
    const data = await queryDbAsync(sql, [showtime_id, hall_id, movie_id]);
    const heldSeatIds = await getHeldOrderSeatIds({
      hallId: hall_id,
      movieId: movie_id,
      showtimeId: showtime_id,
    });
    const seats = data.map((seat) => ({
      ...seat,
      booked_status: heldSeatIds.has(Number(seat.seat_id)) ? 0 : seat.booked_status,
    }));

    return res.json(seats);
  } catch (err) {
    console.error("Seats load error:", err);
    return res.status(500).json({ message: "Không thể tải danh sách ghế" });
  }
};

  // Trả danh mục combo cùng giá khuyến mãi đang áp dụng cho phim.
  const movieCombos = async (req, res) => {
  try {
    const result = await getMovieCombos(req.body.movieId, req.body.theatreId);
    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      message: err.message || "Không thể tải combo bắp nước",
    });
  }
};

  return {
    showtimesDates,
    uniqueMovies,
    halls,
    seats,
    movieCombos,
  };
};

module.exports = createBookingController;
