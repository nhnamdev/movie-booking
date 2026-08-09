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

  const startsAt = new Date(`${dateKey}T${timeKey}`);
  if (Number.isNaN(startsAt.getTime())) return null;
  return new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
};

const createShowtimeAvailabilityService = ({ queryDbAsync }) => {
  const getMovieScreeningWindow = async (movieId, query = queryDbAsync) => {
    const rows = await query(
      `SELECT id, name,
        DATE_FORMAT(release_date, '%Y-%m-%d') AS release_date,
        DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date
       FROM movie
       WHERE id = ?
       LIMIT 1`,
      [movieId]
    );
    return rows[0] || null;
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
        DATE_FORMAT(S.showtime_date, '%Y-%m-%d') AS showtime_date,
        H.name AS hall_name,
        M.name AS movie_name,
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
    parseDurationMinutes,
    getShowtimeEndAt,
    getMovieScreeningWindow,
    assertMovieShowtimeDate,
    assertShowtimeBookable,
  };
};

module.exports = createShowtimeAvailabilityService;
