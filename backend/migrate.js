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

async function columnExists(connection, tableName, columnName) {
  const rows = await query(
    connection,
    "SELECT COUNT(*) AS columnCount FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?",
    [dbName, tableName, columnName]
  );
  return rows[0].columnCount > 0;
}

async function ensureColumn(connection, tableName, columnName, definition) {
  if (await columnExists(connection, tableName, columnName)) return;
  await query(
    connection,
    `ALTER TABLE ${mysql.escapeId(tableName)} ADD COLUMN ${mysql.escapeId(
      columnName
    )} ${definition}`
  );
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

async function normalizeSeedPeople(connection) {
  const seedPeople = [
    ["admin@gmail.com", "Quản trị", "Viên"],
    ["nam@gmail.com", "Nam", "Nguyễn"],
    ["Belal123@gmail.com", "Minh", "Trần"],
    ["farhan@gmail.com", "Huy", "Lê"],
    ["jon@alu.com", "An", "Phạm"],
    ["jon@potato.com", "Bảo", "Hoàng"],
    ["Jon@snow.com", "Long", "Đỗ"],
    ["neloy.saha456@gmail.com", "Khánh", "Vũ"],
    ["niaz@nafi.com", "Duy", "Phan"],
    ["rahim123@gmail.com", "Tú", "Ngô"],
    ["sazin@gmail.com", "Linh", "Bùi"],
  ];

  for (const [email, firstName, lastName] of seedPeople) {
    await query(
      connection,
      "UPDATE person SET first_name = ?, last_name = ? WHERE email = ?",
      [firstName, lastName, email]
    );
  }
}

async function normalizeSeedMovieMetadata(connection) {
  const rows = await query(
    connection,
    "SELECT COUNT(*) AS movieCount, MAX(release_date) AS latestReleaseDate FROM movie"
  );
  const latestReleaseDate = rows[0].latestReleaseDate
    ? new Date(rows[0].latestReleaseDate)
    : null;

  if (
    rows[0].movieCount > 6 ||
    (latestReleaseDate && latestReleaseDate >= new Date("2026-01-01"))
  ) {
    return;
  }

  const seedMovies = [
    [1, "Hoa Kỳ", "136", "Phụ Đề", "T13: Phim dành cho khán giả từ đủ 13 tuổi trở lên (13+)", "2026-05-28"],
    [2, "Hoa Kỳ", "123", "Phụ Đề", "T16: Phim dành cho khán giả từ đủ 16 tuổi trở lên (16+)", "2026-05-28"],
    [3, "Hoa Kỳ", "90", "Lồng Tiếng", "K: Phim dành cho khán giả dưới 13 tuổi xem cùng cha, mẹ hoặc người giám hộ", "2026-05-29"],
    [4, "Hoa Kỳ", "163", "Phụ Đề", "T16: Phim dành cho khán giả từ đủ 16 tuổi trở lên (16+)", "2026-05-29"],
    [5, "Hoa Kỳ", "180", "Phụ Đề", "T18: Phim dành cho khán giả từ đủ 18 tuổi trở lên (18+)", "2026-05-30"],
    [6, "Hoa Kỳ", "114", "Lồng Tiếng", "P: Phim dành cho khán giả mọi lứa tuổi", "2026-05-30"],
  ];

  for (const [id, language, duration, audioType, ageRating, releaseDate] of seedMovies) {
    await query(
      connection,
      "UPDATE movie SET language = ?, duration = ?, audio_type = ?, age_rating = ?, release_date = ? WHERE id = ?",
      [language, duration, audioType, ageRating, releaseDate, id]
    );
  }
}

async function normalizeSeedMoviePeople(connection) {
  const seedCastReplacements = [
    ["Oscar Isaac", "Quang Tuấn"],
    ["Chris Hemsworth", "Kiều Minh Tuấn"],
    ["Jennifer Aniston", "Thu Trang"],
    ["Tom Cruise", "Ngô Thanh Vân"],
    ["Cillian Murphy", "Trấn Thành"],
    ["Margot Robbie", "Kaity Nguyễn"],
  ];

  const seedDirectorReplacements = [
    ["Joaquim Dos Santos", "Nguyễn Quang Dũng"],
    ["Justin K. Thompson", "Phan Gia Nhật Linh"],
    ["Kemp Powers", "Victor Vũ"],
    ["Sam Hargrave", "Lý Hải"],
    ["Jeremy Garelick", "Nhất Trung"],
    ["Christopher McQuarrie", "Charlie Nguyễn"],
    ["Christopher Nolan", "Đinh Hà Uyên Thư"],
    ["Greta Gerwig", "Vũ Ngọc Đãng"],
  ];

  for (const [oldName, newName] of seedCastReplacements) {
    await query(connection, "UPDATE movie SET top_cast = ? WHERE top_cast = ?", [
      newName,
      oldName,
    ]);
  }

  if (!(await tableExists(connection, "movie_directors"))) return;

  for (const [oldName, newName] of seedDirectorReplacements) {
    await query(
      connection,
      "UPDATE movie_directors SET director = ? WHERE director = ?",
      [newName, oldName]
    );
  }
}

async function normalizeSeedShowtimes(connection) {
  const rows = await query(
    connection,
    "SELECT COUNT(*) AS showtimeCount, MAX(showtime_date) AS latestShowDate FROM showtimes"
  );
  const latestShowDate = rows[0].latestShowDate
    ? new Date(rows[0].latestShowDate)
    : null;

  if (
    rows[0].showtimeCount > 12 ||
    (latestShowDate && latestShowDate >= new Date("2026-01-01"))
  ) {
    return;
  }

  const seedShowtimes = [
    [1, "11:30", "2D", "Tiêu chuẩn", "2026-05-28", 120000],
    [2, "13:00", "2D", "Tiêu chuẩn", "2026-05-28", 120000],
    [3, "15:30", "3D", "Tiêu chuẩn", "2026-05-28", 150000],
    [4, "18:20", "2D", "Tiêu chuẩn", "2026-05-28", 120000],
    [5, "19:45", "3D", "Cao cấp", "2026-05-29", 180000],
    [6, "20:45", "2D", "Tiêu chuẩn", "2026-05-29", 120000],
    [7, "09:10", "2D", "Tiêu chuẩn", "2026-05-29", 120000],
    [8, "11:20", "2D", "Tiêu chuẩn", "2026-05-29", 120000],
    [9, "15:50", "3D", "Tiêu chuẩn", "2026-05-30", 150000],
    [10, "18:40", "2D", "Tiêu chuẩn", "2026-05-30", 120000],
    [11, "21:20", "3D", "Cao cấp", "2026-05-30", 180000],
    [12, "22:45", "3D", "Tiêu chuẩn", "2026-05-31", 150000],
  ];

  for (const [id, startTime, showType, screenType, showDate, price] of seedShowtimes) {
    await query(
      connection,
      "UPDATE showtimes SET movie_start_time = ?, show_type = ?, screen_type = ?, showtime_date = ?, price_per_seat = ? WHERE id = ?",
      [startTime, showType, screenType, showDate, price, id]
    );
  }
}

async function applySchemaMigrations(connection) {
  if (await tableExists(connection, "movie")) {
    await ensureColumn(
      connection,
      "movie",
      "audio_type",
      "VARCHAR(30) DEFAULT 'Phụ Đề'"
    );
    await ensureColumn(
      connection,
      "movie",
      "age_rating",
      "VARCHAR(160) DEFAULT 'P: Phim dành cho khán giả mọi lứa tuổi'"
    );
    await query(
      connection,
      "UPDATE movie SET audio_type = COALESCE(NULLIF(audio_type, ''), 'Phụ Đề'), age_rating = COALESCE(NULLIF(age_rating, ''), 'P: Phim dành cho khán giả mọi lứa tuổi')"
    );
    await normalizeSeedMovieMetadata(connection);
    await normalizeSeedMoviePeople(connection);
  }

  if (await tableExists(connection, "showtimes")) {
    await ensureColumn(
      connection,
      "showtimes",
      "screen_type",
      "VARCHAR(30) DEFAULT 'Tiêu chuẩn'"
    );
    await ensureColumn(
      connection,
      "showtimes",
      "status",
      "VARCHAR(20) DEFAULT 'active'"
    );
    await query(
      connection,
      "UPDATE showtimes SET screen_type = COALESCE(NULLIF(screen_type, ''), 'Tiêu chuẩn')"
    );
    await query(
      connection,
      "UPDATE showtimes SET status = 'active' WHERE status IS NULL OR status = ''"
    );
    await query(
      connection,
      "UPDATE showtimes SET screen_type = 'Tiêu chuẩn' WHERE screen_type = 'Standard'"
    );
    await query(
      connection,
      "UPDATE showtimes SET screen_type = 'Cao cấp' WHERE screen_type = 'Deluxe'"
    );
    await normalizeSeedShowtimes(connection);
  }

  if (await tableExists(connection, "shown_in")) {
    await ensureColumn(
      connection,
      "shown_in",
      "status",
      "VARCHAR(20) DEFAULT 'active'"
    );
    await query(
      connection,
      "UPDATE shown_in SET status = 'active' WHERE status IS NULL OR status = ''"
    );
  }

  if (await tableExists(connection, "payment")) {
    await query(
      connection,
      "UPDATE payment SET method = 'Tiền mặt' WHERE method = 'Cash'"
    );
  }

  if (!(await tableExists(connection, "person"))) return;

  await normalizeSeedPhoneNumbers(connection);
  await normalizeSeedPeople(connection);

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
