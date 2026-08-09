const mysql = require("mysql2");

const configuration = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // MySQL hiện lưu DATETIME theo UTC; khai báo rõ để Node không trừ thêm 7 giờ.
  timezone: process.env.DB_TIMEZONE || "Z",
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
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("error when connecting to db:", err.message);
      return;
    }
    console.log("connection is successful");
    connection.release();
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
