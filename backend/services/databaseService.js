const mysql = require("mysql2");

const configuration = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

let connection;

const db = {
  query(...args) {
    if (!connection) throw new Error("Database connection has not been initialized");
    return connection.query(...args);
  },
};

const handleDisconnect = () => {
  connection = mysql.createConnection(configuration);
  connection.connect((err) => {
    if (err) {
      console.log("error when connecting to db:", err);
      setTimeout(handleDisconnect, 2000);
      return;
    }
    console.log("connection is successful");
  });

  connection.on("error", (err) => {
    console.log("db error", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      handleDisconnect();
      return;
    }
    throw err;
  });
};

const connectDatabase = () => {
  if (!connection) handleDisconnect();
  return db;
};

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

module.exports = { connectDatabase, db, query };
