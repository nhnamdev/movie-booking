const fs = require("fs");
const path = require("path");
const mysql = require("mysql2");
require("dotenv").config();

const dbName = process.env.DB_NAME;

if (!dbName) {
  throw new Error("DB_NAME is required before running migrations.");
}

const baseConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
};

const seedPath = path.resolve(
  __dirname,
  "../database/movie_ticket_booking_website.sql"
);

function query(connection, sql, values) {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
}

function connect(config) {
  const connection = mysql.createConnection(config);

  return new Promise((resolve, reject) => {
    connection.connect((error) => {
      if (error) reject(error);
      else resolve(connection);
    });
  });
}

async function createDatabaseIfAllowed() {
  let serverConnection;

  try {
    serverConnection = await connect(baseConfig);
    await query(
      serverConnection,
      `CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(
        dbName
      )} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } catch (error) {
    console.warn(
      `Could not create database automatically (${error.code || error.message}). ` +
        "Continuing with the existing database connection."
    );
  } finally {
    if (serverConnection) serverConnection.end();
  }
}

async function getTableCount(connection) {
  const rows = await query(
    connection,
    "SELECT COUNT(*) AS tableCount FROM information_schema.tables WHERE table_schema = ?",
    [dbName]
  );

  return rows[0].tableCount;
}

function loadSeedSql() {
  return fs
    .readFileSync(seedPath, "utf8")
    .replace(/^\s*CREATE\s+DATABASE\b[^;]*;\s*/i, "")
    .replace(/^\s*USE\s+`?[^`;]+`?\s*;\s*/im, "");
}

async function tableExists(connection, tableName) {
  const rows = await query(connection, "SHOW TABLES LIKE ?", [tableName]);
  return rows.length > 0;
}

async function normalizeSeedPhoneNumbers(connection) {
  const seedPhoneNumbers = [
    ["admin@gmail.com", "0858200725"],
    ["nam@gmail.com", "0912345678"],
    ["Belal123@gmail.com", "0987654321"],
    ["farhan@gmail.com", "0901234567"],
    ["jon@alu.com", "0934567890"],
    ["jon@potato.com", "0967890123"],
    ["Jon@snow.com", "0971112233"],
    ["neloy.saha456@gmail.com", "0888888888"],
    ["niaz@nafi.com", "0866666666"],
    ["rahim123@gmail.com", "0899999999"],
    ["sazin@gmail.com", "0323456789"],
  ];

  for (const [email, phoneNumber] of seedPhoneNumbers) {
    await query(
      connection,
      "UPDATE person SET phone_number = ? WHERE email = ? AND (phone_number IS NULL OR phone_number NOT REGEXP '^0[0-9]{9}$')",
      [phoneNumber, email]
    );
  }
}

async function applySchemaMigrations(connection) {
  if (!(await tableExists(connection, "person"))) return;

  await normalizeSeedPhoneNumbers(connection);

  const invalidRows = await query(
    connection,
    "SELECT COUNT(*) AS invalidCount FROM person WHERE phone_number IS NOT NULL AND phone_number NOT REGEXP '^0[0-9]{9}$'"
  );

  if (invalidRows[0].invalidCount > 0) {
    console.warn(
      `Found ${invalidRows[0].invalidCount} non-Vietnamese phone number(s). ` +
        "Skipping phone_number CHAR(10) migration to avoid truncating data."
    );
    return;
  }

  await query(
    connection,
    "ALTER TABLE person MODIFY phone_number CHAR(10) DEFAULT NULL"
  );
  console.log("Schema migration completed: person.phone_number is CHAR(10).");
}

async function run() {
  if (process.env.DB_AUTO_MIGRATE === "false") {
    console.log("DB_AUTO_MIGRATE=false, skipping database migration.");
    return;
  }

  await createDatabaseIfAllowed();

  const dbConnection = await connect({
    ...baseConfig,
    database: dbName,
  });

  try {
    const tableCount = await getTableCount(dbConnection);

    if (tableCount > 0) {
      console.log(`Database ${dbName} already has tables, skipping seed import.`);
      await applySchemaMigrations(dbConnection);
      return;
    }

    console.log(`Database ${dbName} is empty, importing seed schema.`);
    await query(dbConnection, loadSeedSql());
    await applySchemaMigrations(dbConnection);
    console.log("Database migration completed.");
  } finally {
    dbConnection.end();
  }
}

run().catch((error) => {
  console.error("Database migration failed:", error);
  process.exit(1);
});
