// Helper truy vấn DB cho AI - tách riêng để chatbot function calling tái sử dụng
// Tất cả hàm chỉ READ, không UPDATE/DELETE để bảo vệ dữ liệu

const query = (db, sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });

const getLatestMovies = (db, limit = 10) => {
  const sql = `SELECT m.id, m.name, m.image_path, m.rating, m.duration, m.release_date,
    GROUP_CONCAT(g.genre SEPARATOR ', ') as genres
    FROM movie m
    LEFT JOIN movie_genre g ON m.id = g.movie_id
    GROUP BY m.id
    ORDER BY m.release_date DESC
    LIMIT ?`;
  return query(db, sql, [limit]);
};

const getMovieDetails = async (db, movieId) => {
  const sql = `SELECT m.*, GROUP_CONCAT(DISTINCT g.genre SEPARATOR ', ') as genres,
    GROUP_CONCAT(DISTINCT d.director SEPARATOR ', ') as directors
    FROM movie m
    LEFT JOIN movie_genre g ON m.id = g.movie_id
    LEFT JOIN movie_directors d ON m.id = d.movie_id
    WHERE m.id = ?
    GROUP BY m.id`;
  const rows = await query(db, sql, [movieId]);
  return rows[0] || null;
};

const getTheatres = (db) => {
  return query(db, "SELECT id, name, location, location_details FROM theatre");
};

const getShowtimesByMovie = (db, movieId) => {
  const sql = `SELECT s.id, s.showtime_date, s.movie_start_time, s.show_type,
    t.name as theatre_name, t.location, h.name as hall_name
    FROM showtimes s
    JOIN shown_in si ON s.id = si.showtime_id
    JOIN hall h ON si.hall_id = h.id
    JOIN theatre t ON h.theatre_id = t.id
    WHERE si.movie_id = ? AND s.showtime_date >= CURDATE()
    ORDER BY s.showtime_date ASC, s.movie_start_time ASC
    LIMIT 30`;
  return query(db, sql, [movieId]);
};

const getGenres = (db) => {
  return query(db, "SELECT DISTINCT genre FROM movie_genre ORDER BY genre");
};

const getCustomerHistory = (db, email) => {
  const sql = `SELECT DISTINCT m.id, m.name, m.image_path,
    GROUP_CONCAT(DISTINCT g.genre SEPARATOR ', ') as genres,
    MAX(t.purchase_date) as last_watched
    FROM ticket t
    JOIN payment p ON t.payment_id = p.id
    JOIN movie m ON t.movie_id = m.id
    LEFT JOIN movie_genre g ON m.id = g.movie_id
    WHERE p.customer_email = ?
    GROUP BY m.id
    ORDER BY last_watched DESC
    LIMIT 20`;
  return query(db, sql, [email]);
};

const getCurrentlyShowing = (db) => {
  const sql = `SELECT DISTINCT m.id, m.name, m.image_path, m.rating, m.duration,
    GROUP_CONCAT(DISTINCT g.genre SEPARATOR ', ') as genres
    FROM movie m
    LEFT JOIN movie_genre g ON m.id = g.movie_id
    JOIN shown_in si ON m.id = si.movie_id
    JOIN showtimes s ON si.showtime_id = s.id
    WHERE s.showtime_date >= CURDATE()
    GROUP BY m.id
    ORDER BY m.release_date DESC`;
  return query(db, sql);
};

const getRevenueStats = async (db) => {
  const totalRevenue = await query(db, "SELECT COALESCE(SUM(amount),0) as total FROM payment");
  const totalTickets = await query(db, "SELECT COUNT(*) as total FROM ticket");
  const totalCustomers = await query(db, "SELECT COUNT(*) as total FROM person WHERE person_type = 'Customer'");
  const topMovies = await query(db, `SELECT m.name, COUNT(t.id) as tickets_sold
    FROM ticket t JOIN movie m ON t.movie_id = m.id
    GROUP BY m.id ORDER BY tickets_sold DESC LIMIT 5`);
  const slowMovies = await query(db, `SELECT m.name, COUNT(t.id) as tickets_sold
    FROM movie m LEFT JOIN ticket t ON m.id = t.movie_id
    GROUP BY m.id ORDER BY tickets_sold ASC LIMIT 5`);
  return {
    totalRevenue: totalRevenue[0]?.total || 0,
    totalTickets: totalTickets[0]?.total || 0,
    totalCustomers: totalCustomers[0]?.total || 0,
    topMovies,
    slowMovies,
  };
};

module.exports = {
  getLatestMovies,
  getMovieDetails,
  getTheatres,
  getShowtimesByMovie,
  getGenres,
  getCustomerHistory,
  getCurrentlyShowing,
  getRevenueStats,
};
