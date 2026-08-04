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

  const health = (req, res) => {
  return res.json("Hello Backend Side");
};

  const latestMovies = (req, res) => {
  const sql =
    "SELECT m.id, m.name, m.image_path, m.rating, m.duration, m.release_date as release_date, GROUP_CONCAT(g.genre SEPARATOR ', ') as genres FROM movie m INNER JOIN movie_genre g ON m.id = g.movie_id GROUP BY m.id ORDER BY release_date DESC LIMIT 6";

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  const locationDetails = (req, res) => {
  const sql = "SELECT location_details FROM theatre";

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  const locationFeatures = (req, res) => {
  const sql = "SELECT DISTINCT title,image_path,description FROM features";

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  const theatres = (req, res) => {
  const sql = "SELECT id, name,location FROM theatre";

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

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
      WHERE s2.status = 'active' AND si2.status = 'active'
      GROUP BY s2.showtime_date
      ORDER BY s2.showtime_date DESC
      LIMIT 4
    ) AS LatestDates ON S.showtime_date = LatestDates.showtime_date
    WHERE T.name = ?
      AND S.status = 'active'
      AND SI.status = 'active'
  `;

  const sql1 = `${baseSql} AND MG.genre = ? ORDER BY S.showtime_date ASC, S.movie_start_time ASC, M.name ASC`;
  const sql2 = `${baseSql} ORDER BY S.showtime_date ASC, S.movie_start_time ASC, M.name ASC`;

  userGenre === "All"
    ? db.query(sql2, [theatreName], (err, data) => {
        if (err) {
          return res.json({ error: "An error occurred while fetching data." });
        }

        return res.json(data);
      })
    : db.query(sql1, [theatreName, userGenre], (err, data) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ error: "An error occurred while fetching data." });
        }

        return res.json(data);
      });
};

  const genres = (req, res) => {
  const sql = "SELECT DISTINCT genre FROM movie_genre";

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  const movieDetail = (req, res) => {
  const id = req.body.movieDetailsId;

  const sql = `SELECT
  M.*,
  GROUP_CONCAT(DISTINCT MD.director SEPARATOR ', ') AS directors,
  GROUP_CONCAT(DISTINCT MG.genre SEPARATOR ', ') AS genres
FROM
  movie M
 JOIN
  movie_directors MD ON M.id = MD.movie_id
 JOIN
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

  const movieWiseShowtime = (req, res) => {
  const movieId = req.body.movieDetailsId;
  const theatreId = req.body.theatreId;

  const sql = `SELECT S.id AS showtime_id, H.id AS hall_id, M.id AS movie_id, DATE_FORMAT(S.showtime_date, '%Y-%m-%d') AS showtime_date, S.movie_start_time, S.show_type, S.price_per_seat FROM theatre T JOIN hall H ON T.id = H.theatre_id JOIN shown_in SI ON H.id = SI.hall_id JOIN showtimes S ON SI.showtime_id = S.id JOIN movie M ON SI.movie_id = M.id JOIN ( SELECT s2.showtime_date FROM showtimes s2 JOIN shown_in si2 ON s2.id = si2.showtime_id WHERE s2.status = 'active' AND si2.status = 'active' GROUP BY s2.showtime_date ORDER BY s2.showtime_date DESC LIMIT 4 ) AS LatestDates ON S.showtime_date = LatestDates.showtime_date WHERE T.id = ? AND M.id = ? AND S.status = 'active' AND SI.status = 'active' ORDER BY S.showtime_date ASC`;

  db.query(sql, [theatreId, movieId], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
};

  const otherMovies = (req, res) => {
  const movieId = req.body.movieDetailsId;

  const sql =
    "SELECT m.id, m.name, m.image_path, m.rating, m.duration, m.release_date as release_date, GROUP_CONCAT(g.genre SEPARATOR ', ') as genres FROM movie m INNER JOIN movie_genre g ON m.id = g.movie_id GROUP BY m.id HAVING m.id!=?";

  db.query(sql, [movieId], (err, data) => {
    if (err) return res.json(err);

    return res.status(200).json(data);
  });
};

  return {
    health,
    latestMovies,
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
