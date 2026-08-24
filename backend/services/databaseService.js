const mysql = require("mysql2");

const configuration = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: process.env.DB_TIMEZONE || "+07:00",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
};

let pool;

// Giữ giao diện callback cũ cho các controller trong khi dùng pool an toàn hơn.
const db = {
  query(...args) {
    if (!pool) throw new Error("Database connection has not been initialized");
    return pool.query(...args);
  },
};

// Khởi tạo pool và kiểm tra kết nối mà không giữ một connection dùng chung.
const connectDatabase = () => {
  if (pool) return db;

  pool = mysql.createPool(configuration);
  pool.on("connection", (connection) => {
    connection.query("SET time_zone = ?", [process.env.DB_SESSION_TIMEZONE || "+07:00"]);
  });
  pool.getConnection(async (err, connection) => {
    if (err) {
      console.error("error when connecting to db:", err.message);
      return;
    }
    console.log("connection is successful");
    try {
      await connectionQuery(
        connection,
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
      );

      // Tự động kiểm tra và seed suất chiếu đến 10/09/2026 nếu chưa có
      const futureRows = await connectionQuery(
        connection,
        `SELECT COUNT(*) AS futureCount FROM showtimes WHERE showtime_date >= CURDATE() AND status = 'active'`
      );
      const futureCount = Array.isArray(futureRows) && futureRows[0] ? Number(futureRows[0].futureCount || 0) : 0;

      if (futureCount < 10) {
        console.log("Phát hiện chưa có suất chiếu tương lai, tự động khởi tạo lịch chiếu CGV đến 10/09/2026...");
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
          await seedCgvData(promiseConn);
          await promiseConn.commit();
          console.log("Tự động seed suất chiếu CGV đến 10/09/2026 thành công!");
        } catch (seedErr) {
          await promiseConn.rollback();
          console.error("Lỗi khi tự động seed:", seedErr.message);
        } finally {
          await promiseConn.end();
        }
      }
    } catch (tblErr) {
      console.warn("Auto init / seed notice:", tblErr.message);
    } finally {
      connection.release();
    }
  });

  return db;
};

// Thực thi truy vấn độc lập bằng một connection do pool quản lý.
const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

const connectionQuery = (connection, sql, params = []) =>
  new Promise((resolve, reject) => {
    connection.query(sql, params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

// Cấp connection riêng cho toàn bộ transaction để các request không xen kẽ nhau.
const withTransaction = () =>
  new Promise((resolve, reject) => {
    if (!pool) return reject(new Error("Database connection has not been initialized"));
    pool.getConnection((err, connection) => {
      if (err) reject(err);
      else resolve(connection);
    });
  }).then(async (connection) => {
    try {
      await new Promise((resolve, reject) =>
        connection.beginTransaction((err) => (err ? reject(err) : resolve()))
      );

      return {
        query: (sql, params = []) => connectionQuery(connection, sql, params),
        commit: () =>
          new Promise((resolve, reject) =>
            connection.commit((err) => (err ? reject(err) : resolve()))
          ),
        rollback: () =>
          new Promise((resolve) => connection.rollback(() => resolve())),
        release: () => connection.release(),
      };
    } catch (err) {
      connection.release();
      throw err;
    }
  });

module.exports = { connectDatabase, db, query, withTransaction };
