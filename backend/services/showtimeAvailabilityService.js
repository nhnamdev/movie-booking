const parseDurationMinutes = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (/^\d+$/.test(normalized)) return Number(normalized);

  const hourMinuteMatch = normalized.match(/^(\d+)\s*h(?:\s*(\d+)\s*m?)?$/);
  if (hourMinuteMatch) {
    return Number(hourMinuteMatch[1]) * 60 + Number(hourMinuteMatch[2] || 0);
  }

  return 0;
};

const toDateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getShowtimeEndAt = ({ showtimeDate, movieStartTime, duration }) => {
  const dateKey = toDateKey(showtimeDate);
  const timeKey = String(movieStartTime || "").slice(0, 8);
  const durationMinutes = parseDurationMinutes(duration);
  if (!dateKey || !timeKey || durationMinutes <= 0) return null;

  const startsAt = new Date(`${dateKey}T${timeKey}${process.env.DB_TIMEZONE || "+07:00"}`);
  if (Number.isNaN(startsAt.getTime())) return null;
  return new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
};

const getDayType = (showtimeDate) => {
  const dateKey = toDateKey(showtimeDate);
  if (!dateKey) return "WEEKDAY";
  const date = new Date(`${dateKey}T00:00:00`);
  const day = date.getDay();
  if ([0, 5, 6].includes(day)) return "WEEKEND";
  return "WEEKDAY";
};

const TICKET_PRICE_BY_ROOM = {
  "Tiêu chuẩn": { "2D": 120000, "3D": 150000 },
  "Cao cấp": { "2D": 150000, "3D": 180000 },
};

const createShowtimeAvailabilityService = ({ queryDbAsync }) => {
  const resolveTicketPrice = async ({
    roomType,
    showType,
    showtimeDate,
    seatType = "STANDARD",
    query = queryDbAsync,
  }) => {
    const dayType = getDayType(showtimeDate);
    const rows = await query(
      `SELECT price FROM ticket_price_config
       WHERE room_type = ? AND show_type = ? AND day_type = ? AND seat_type = ?
       LIMIT 1`,
      [roomType, showType, dayType, seatType]
    );
    if (rows.length > 0) {
      return Number(rows[0].price);
    }
    const fallback = TICKET_PRICE_BY_ROOM[roomType]?.[showType] || 120000;
    return fallback;
  };

  const getMovieScreeningWindow = async (movieId, query = queryDbAsync) => {
    const rows = await query(
      `SELECT id, name, duration,
        DATE_FORMAT(release_date, '%Y-%m-%d') AS release_date,
        DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date
       FROM movie
       WHERE id = ?
       LIMIT 1`,
      [movieId]
    );
    return rows[0] || null;
  };

  const assertNoShowtimeOverlap = async ({
    movieId,
    hallId,
    showtimeDate,
    movieStartTime,
    excludeShowtimeId = null,
    query = queryDbAsync,
  }) => {
    const movie = await getMovieScreeningWindow(movieId, query);
    const durationMinutes = parseDurationMinutes(movie?.duration);
    if (!movie || durationMinutes <= 0) {
      const err = new Error("Thời lượng phim không hợp lệ, chưa thể xếp lịch");
      err.statusCode = 409;
      throw err;
    }

    const halls = await query(
      `SELECT H.id, H.name, H.cleaning_buffer_minutes, T.opening_time, T.closing_time
       FROM hall H JOIN theatre T ON T.id = H.theatre_id
       WHERE H.id = ? LIMIT 1 FOR UPDATE`,
      [hallId]
    );
    if (halls.length === 0) {
      const err = new Error("Không tìm thấy phòng chiếu");
      err.statusCode = 404;
      throw err;
    }

    const hall = halls[0];
    const startTime = String(movieStartTime).slice(0, 8);
    const screeningEndMinutes = durationMinutes + Number(hall.cleaning_buffer_minutes || 15);
    const operatingRows = await query(
      `SELECT
        TIME(?) >= TIME(?) AS opens_in_time,
        TIME(TIMESTAMPADD(MINUTE, ?, TIMESTAMP(?, ?))) <= TIME(?) AS closes_in_time`,
      [startTime, hall.opening_time, screeningEndMinutes, toDateKey(showtimeDate), startTime, hall.closing_time]
    );
    if (!operatingRows[0]?.opens_in_time || !operatingRows[0]?.closes_in_time) {
      const err = new Error(`${hall.name} chỉ hoạt động trong khung ${String(hall.opening_time).slice(0, 5)} - ${String(hall.closing_time).slice(0, 5)}`);
      err.statusCode = 409;
      err.code = "OUTSIDE_THEATRE_HOURS";
      throw err;
    }

    const conflicts = await query(
      `SELECT
        m.name AS movie_name,
        h.name AS hall_name,
        TIME_FORMAT(TIME(s.movie_start_time), '%H:%i') AS starts_at,
        DATE_FORMAT(
          TIMESTAMPADD(MINUTE, CAST(m.duration AS UNSIGNED) + ?, TIMESTAMP(s.showtime_date, s.movie_start_time)),
          '%H:%i'
        ) AS ends_at
       FROM shown_in si
       JOIN showtimes s ON s.id = si.showtime_id
       JOIN movie m ON m.id = si.movie_id
       JOIN hall h ON h.id = si.hall_id
       WHERE si.hall_id = ?
         AND s.showtime_date = ?
         AND si.status = 'active'
         AND s.status = 'active'
         AND (? IS NULL OR s.id <> ?)
         AND TIMESTAMP(?, ?) < TIMESTAMPADD(
           MINUTE,
           CAST(m.duration AS UNSIGNED) + ?,
           TIMESTAMP(s.showtime_date, s.movie_start_time)
         )
         AND TIMESTAMPADD(MINUTE, ?, TIMESTAMP(?, ?)) > TIMESTAMP(s.showtime_date, s.movie_start_time)
       ORDER BY s.movie_start_time ASC
       LIMIT 1`,
      [
        Number(hall.cleaning_buffer_minutes || 15),
        hallId,
        toDateKey(showtimeDate),
        excludeShowtimeId,
        excludeShowtimeId,
        toDateKey(showtimeDate),
        startTime,
        Number(hall.cleaning_buffer_minutes || 15),
        screeningEndMinutes,
        toDateKey(showtimeDate),
        startTime,
      ]
    );

    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      const err = new Error(
        `${conflict.hall_name} đã có phim "${conflict.movie_name}" từ ${conflict.starts_at} đến ${conflict.ends_at}`
      );
      err.statusCode = 409;
      err.code = "SHOWTIME_OVERLAP";
      throw err;
    }
  };

  const assertHallSupportsShowtime = async ({
    hallId,
    showType,
    screenType,
    showtimeDate,
    pricePerSeat,
    query = queryDbAsync,
  }) => {
    const normalizedShowType = String(showType || "").toUpperCase();
    const halls = await query(
      `SELECT id, name, status, screen_type, projection_capability
       FROM hall WHERE id = ? LIMIT 1`,
      [hallId]
    );
    if (halls.length === 0) {
      const err = new Error("Không tìm thấy phòng chiếu");
      err.statusCode = 404;
      throw err;
    }

    const hall = halls[0];
    if (hall.status !== "active") {
      const err = new Error(`${hall.name} đang ngừng hoạt động`);
      err.statusCode = 409;
      throw err;
    }
    if (!["2D", "3D"].includes(normalizedShowType)) {
      const err = new Error("Định dạng suất chiếu chỉ có thể là 2D hoặc 3D");
      err.statusCode = 400;
      throw err;
    }
    if (
      hall.projection_capability !== "BOTH" &&
      hall.projection_capability !== normalizedShowType
    ) {
      const err = new Error(`${hall.name} không hỗ trợ định dạng ${normalizedShowType}`);
      err.statusCode = 409;
      err.code = "HALL_FORMAT_UNSUPPORTED";
      throw err;
    }
    if (String(screenType || "") !== hall.screen_type) {
      const err = new Error(`${hall.name} thuộc hạng ${hall.screen_type}, không phải ${screenType}`);
      err.statusCode = 409;
      err.code = "HALL_SCREEN_TYPE_MISMATCH";
      throw err;
    }

    const expectedPrice = await resolveTicketPrice({
      roomType: hall.screen_type,
      showType: normalizedShowType,
      showtimeDate,
      seatType: "STANDARD",
      query,
    });

    return { ...hall, show_type: normalizedShowType, price_per_seat: expectedPrice };
  };

  const assertMovieShowtimeDate = async ({ movieId, showtimeDate, query = queryDbAsync }) => {
    const movie = await getMovieScreeningWindow(movieId, query);
    if (!movie) {
      const err = new Error("Không tìm thấy phim");
      err.statusCode = 404;
      throw err;
    }

    const dateKey = toDateKey(showtimeDate);
    if (!dateKey || dateKey < movie.release_date || (movie.end_date && dateKey > movie.end_date)) {
      const err = new Error(
        `Ngày chiếu phải nằm trong thời gian công chiếu ${movie.release_date} - ${movie.end_date || "không giới hạn"}`
      );
      err.statusCode = 409;
      throw err;
    }
    return movie;
  };

  const assertShowtimeBookable = async ({
    movieId,
    hallId,
    showtimeId,
    query = queryDbAsync,
  }) => {
    const rows = await query(
      `SELECT
        S.price_per_seat,
        S.movie_start_time,
        S.show_type,
        DATE_FORMAT(S.showtime_date, '%Y-%m-%d') AS showtime_date,
        H.name AS hall_name,
        TH.id AS theatre_id,
        TH.name AS theatre_name,
        TH.location_details AS theatre_address,
        M.name AS movie_name,
        M.image_path AS movie_image,
        M.duration,
        DATE_FORMAT(M.end_date, '%Y-%m-%d') AS end_date
       FROM shown_in SI
       JOIN showtimes S ON SI.showtime_id = S.id
       JOIN hall H ON SI.hall_id = H.id
       JOIN theatre TH ON H.theatre_id = TH.id
       JOIN movie M ON SI.movie_id = M.id
       WHERE SI.movie_id = ?
         AND SI.hall_id = ?
         AND SI.showtime_id = ?
         AND SI.status = 'active'
         AND S.status = 'active'
         AND H.status = 'active'
         AND TH.status = 'active'
       LIMIT 1`,
      [movieId, hallId, showtimeId]
    );

    if (rows.length === 0) {
      const err = new Error("Suất chiếu đã ngưng bán");
      err.statusCode = 409;
      throw err;
    }

    const show = rows[0];
    const endAt = getShowtimeEndAt({
      showtimeDate: show.showtime_date,
      movieStartTime: show.movie_start_time,
      duration: show.duration,
    });
    if (!endAt) {
      const err = new Error("Thời lượng phim không hợp lệ, chưa thể mở bán suất chiếu");
      err.statusCode = 409;
      throw err;
    }
    if (endAt.getTime() <= Date.now()) {
      const err = new Error("Suất chiếu đã kết thúc, không thể đặt vé");
      err.statusCode = 409;
      err.code = "SHOWTIME_ENDED";
      throw err;
    }

    return { ...show, ends_at: endAt };
  };

  return {
    getDayType,
    resolveTicketPrice,
    parseDurationMinutes,
    getShowtimeEndAt,
    getMovieScreeningWindow,
    assertMovieShowtimeDate,
    assertNoShowtimeOverlap,
    assertHallSupportsShowtime,
    assertShowtimeBookable,
  };
};

module.exports = createShowtimeAvailabilityService;
