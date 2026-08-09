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
  if (await tableExists(connection, "theatre")) {
    await query(connection, "ALTER TABLE theatre MODIFY name VARCHAR(100) DEFAULT NULL");
    await query(connection, "ALTER TABLE theatre MODIFY location VARCHAR(100) DEFAULT NULL");
    await query(connection, "ALTER TABLE theatre MODIFY location_details VARCHAR(500) DEFAULT NULL");
    await ensureColumn(connection, "theatre", "status", "VARCHAR(20) NOT NULL DEFAULT 'active'");
    await query(connection, "UPDATE theatre SET status = 'active' WHERE status IS NULL OR status = ''");
  }

  if (await tableExists(connection, "hall")) {
    await query(connection, "ALTER TABLE hall MODIFY name VARCHAR(100) DEFAULT NULL");
    await ensureColumn(connection, "hall", "status", "VARCHAR(20) NOT NULL DEFAULT 'active'");
    await query(connection, "UPDATE hall SET status = 'active' WHERE status IS NULL OR status = ''");
  }

  if (await tableExists(connection, "seat")) {
    await query(connection, "ALTER TABLE seat MODIFY name VARCHAR(10) DEFAULT NULL");
  }

  if (await tableExists(connection, "hallwise_seat")) {
    await ensureColumn(connection, "hallwise_seat", "seat_label", "VARCHAR(10) DEFAULT NULL");
    await ensureColumn(connection, "hallwise_seat", "row_index", "INT DEFAULT NULL");
    await ensureColumn(connection, "hallwise_seat", "column_index", "INT DEFAULT NULL");
    await ensureColumn(
      connection,
      "hallwise_seat",
      "seat_type",
      "VARCHAR(20) NOT NULL DEFAULT 'STANDARD'"
    );
    await ensureColumn(
      connection,
      "hallwise_seat",
      "price_surcharge",
      "INT NOT NULL DEFAULT 0"
    );
    await ensureColumn(
      connection,
      "hallwise_seat",
      "is_active",
      "TINYINT(1) NOT NULL DEFAULT 1"
    );
    await query(
      connection,
      `UPDATE hallwise_seat HS
       JOIN seat S ON S.id = HS.seat_id
       SET HS.seat_label = COALESCE(HS.seat_label, S.name),
         HS.row_index = COALESCE(HS.row_index, ASCII(UPPER(LEFT(S.name, 1))) - 64),
         HS.column_index = COALESCE(HS.column_index, CAST(SUBSTRING(S.name, 2) AS UNSIGNED))`
    );
  }

  await query(
    connection,
    `CREATE TABLE IF NOT EXISTS concession_combo (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      description VARCHAR(255) NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'Combo bắp nước',
      image_url VARCHAR(500) DEFAULT NULL,
      base_price INT NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  );
  await ensureColumn(
    connection,
    "concession_combo",
    "category",
    "VARCHAR(80) NOT NULL DEFAULT 'Combo bắp nước'"
  );
  await ensureColumn(
    connection,
    "concession_combo",
    "image_url",
    "VARCHAR(500) DEFAULT NULL"
  );
  await query(
    connection,
    "UPDATE concession_combo SET category = 'Combo bắp nước' WHERE category IS NULL OR category = ''"
  );
  await query(
    connection,
    `CREATE TABLE IF NOT EXISTS movie_combo_promotion (
      id INT NOT NULL AUTO_INCREMENT,
      movie_id INT NOT NULL,
      combo_id INT NOT NULL,
      discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
      promotion_label VARCHAR(120) DEFAULT NULL,
      start_at DATETIME DEFAULT NULL,
      end_at DATETIME DEFAULT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY movie_combo_promotion_unique (movie_id, combo_id),
      KEY movie_combo_promotion_combo_idx (combo_id),
      CONSTRAINT movie_combo_promotion_movie_fk FOREIGN KEY (movie_id) REFERENCES movie(id) ON DELETE CASCADE,
      CONSTRAINT movie_combo_promotion_combo_fk FOREIGN KEY (combo_id) REFERENCES concession_combo(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  );
  await query(
    connection,
    `INSERT IGNORE INTO concession_combo (id, name, description, base_price, is_active) VALUES
      (1, 'CGV Solo', '1 bắp rang bơ cỡ vừa và 1 nước ngọt cỡ vừa', 89000, 1),
      (2, 'CGV Couple', '1 bắp rang bơ cỡ lớn và 2 nước ngọt cỡ vừa', 139000, 1),
      (3, 'CGV Family', '2 bắp rang bơ cỡ lớn và 4 nước ngọt cỡ vừa', 259000, 1),
      (4, 'Bắp rang bơ cỡ lớn', 'Bắp rang bơ truyền thống, phục vụ tại quầy', 65000, 1),
      (5, 'Bắp caramel cỡ lớn', 'Bắp rang phủ caramel thơm giòn', 75000, 1),
      (6, 'Coke 32oz', 'Nước ngọt Coke cỡ 32oz', 37000, 1),
      (7, 'Coke Zero 32oz', 'Nước ngọt không đường cỡ 32oz', 37000, 1),
      (8, 'Nước suối 500ml', 'Nước suối đóng chai 500ml', 20000, 1),
      (9, 'Snack khoai tây', 'Snack khoai tây giòn vị truyền thống', 28000, 1)`
  );
  await query(
    connection,
    `UPDATE concession_combo SET category = CASE
       WHEN id IN (4, 5) THEN 'Bắp rang'
       WHEN id IN (6, 7) THEN 'Nước ngọt'
       WHEN id = 8 THEN 'Nước uống'
       WHEN id = 9 THEN 'Snacks - Kẹo'
       ELSE category
     END
     WHERE id BETWEEN 4 AND 9`
  );

  const promotionRows = await query(
    connection,
    "SELECT COUNT(*) AS promotionCount FROM movie_combo_promotion"
  );
  if (Number(promotionRows[0].promotionCount) === 0) {
    await query(
      connection,
      `INSERT INTO movie_combo_promotion
        (movie_id, combo_id, discount_percent, promotion_label, is_active)
       SELECT M.id, C.id,
         CASE C.id WHEN 1 THEN 10 WHEN 2 THEN 15 ELSE 20 END,
         'Ưu đãi combo theo phim',
         1
       FROM (SELECT id FROM movie ORDER BY id LIMIT 2) M
       CROSS JOIN concession_combo C
       WHERE C.is_active = 1`
    );
  }

  if (!(await tableExists(connection, "payos_orders"))) {
    await query(
      connection,
      `CREATE TABLE payos_orders (
        id INT NOT NULL AUTO_INCREMENT,
        order_code BIGINT NOT NULL,
        payment_link_id VARCHAR(100) DEFAULT NULL,
        checkout_url TEXT DEFAULT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        amount INT NOT NULL,
        customer_email VARCHAR(100) NOT NULL,
        payment_method VARCHAR(30) NOT NULL DEFAULT 'PayOS',
        payload_json LONGTEXT NOT NULL,
        payment_id INT DEFAULT NULL,
        ticket_ids_json LONGTEXT DEFAULT NULL,
        error_message TEXT DEFAULT NULL,
        expires_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY payos_orders_order_code_unique (order_code),
        KEY payos_orders_status_idx (status),
        KEY payos_orders_customer_email_idx (customer_email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
    );
  }

  if (await tableExists(connection, "payos_orders")) {
    await ensureColumn(
      connection,
      "payos_orders",
      "payment_method",
      "VARCHAR(30) NOT NULL DEFAULT 'PayOS'"
    );
    await ensureColumn(
      connection,
      "payos_orders",
      "expires_at",
      "DATETIME DEFAULT NULL"
    );
    await query(
      connection,
      "UPDATE payos_orders SET payment_method = 'PayOS' WHERE payment_method IS NULL OR payment_method = ''"
    );
    await query(
      connection,
      "UPDATE payos_orders SET payment_method = 'Thanh toán tại rạp' WHERE payment_method = 'Tại quầy'"
    );
    await query(
      connection,
      `UPDATE payos_orders
       SET expires_at = CASE
         WHEN payment_method = 'Thanh toán tại rạp' THEN DATE_ADD(created_at, INTERVAL 30 MINUTE)
         ELSE DATE_ADD(created_at, INTERVAL 10 MINUTE)
       END
       WHERE expires_at IS NULL AND status IN ('UNPAID', 'PENDING')`
    );
  }

  if (await tableExists(connection, "movie")) {
    await ensureColumn(connection, "movie", "end_date", "DATE DEFAULT NULL");
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
    await query(
      connection,
      `UPDATE movie
       SET duration = CASE
         WHEN LOWER(duration) REGEXP '^[0-9]+h[0-9]+m$' THEN
           CAST(SUBSTRING_INDEX(LOWER(duration), 'h', 1) AS UNSIGNED) * 60 +
           CAST(REPLACE(SUBSTRING_INDEX(LOWER(duration), 'h', -1), 'm', '') AS UNSIGNED)
         WHEN LOWER(duration) REGEXP '^[0-9]+h$' THEN
           CAST(REPLACE(LOWER(duration), 'h', '') AS UNSIGNED) * 60
         ELSE duration
       END`
    );
    await query(
      connection,
      `UPDATE movie m
       LEFT JOIN (
         SELECT si.movie_id, MAX(s.showtime_date) AS latest_showtime_date
         FROM shown_in si
         JOIN showtimes s ON s.id = si.showtime_id
         GROUP BY si.movie_id
       ) schedule ON schedule.movie_id = m.id
       SET m.end_date = GREATEST(
         DATE_ADD(m.release_date, INTERVAL 30 DAY),
         COALESCE(schedule.latest_showtime_date, m.release_date)
       )
       WHERE m.end_date IS NULL`
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
    await ensureColumn(
      connection,
      "payment",
      "payment_status",
      "VARCHAR(20) NOT NULL DEFAULT 'PAID'"
    );
    await query(
      connection,
      "UPDATE payment SET payment_status = 'PAID' WHERE payment_status IS NULL OR payment_status = ''"
    );
    await query(
      connection,
      "UPDATE payment SET method = 'Thanh toán tại rạp' WHERE method IN ('Cash', 'Tiền mặt', 'Tại quầy')"
    );
  }

  if (!(await tableExists(connection, "person"))) return;

  await ensureColumn(
    connection,
    "person",
    "account_status",
    "VARCHAR(20) NOT NULL DEFAULT 'active'"
  );
  await query(
    connection,
    "UPDATE person SET account_status = 'active' WHERE account_status IS NULL OR account_status = ''"
  );

  await query(
    connection,
    `CREATE TABLE IF NOT EXISTS reward_account (
      customer_email VARCHAR(100) NOT NULL,
      available_points INT NOT NULL DEFAULT 0,
      held_points INT NOT NULL DEFAULT 0,
      lifetime_earned INT NOT NULL DEFAULT 0,
      lifetime_redeemed INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (customer_email),
      CONSTRAINT reward_account_customer_fk FOREIGN KEY (customer_email)
        REFERENCES person(email) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  );
  await query(
    connection,
    `CREATE TABLE IF NOT EXISTS reward_point_hold (
      id INT NOT NULL AUTO_INCREMENT,
      order_code BIGINT NOT NULL,
      customer_email VARCHAR(100) NOT NULL,
      points INT NOT NULL,
      discount_amount INT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'HELD',
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY reward_point_hold_order_unique (order_code),
      KEY reward_point_hold_customer_idx (customer_email, status),
      KEY reward_point_hold_expiry_idx (status, expires_at),
      CONSTRAINT reward_point_hold_customer_fk FOREIGN KEY (customer_email)
        REFERENCES person(email) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  );
  await query(
    connection,
    `CREATE TABLE IF NOT EXISTS reward_point_ledger (
      id BIGINT NOT NULL AUTO_INCREMENT,
      customer_email VARCHAR(100) NOT NULL,
      order_code BIGINT NOT NULL,
      entry_type VARCHAR(20) NOT NULL,
      points_delta INT NOT NULL,
      balance_after INT NOT NULL,
      description VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY reward_point_ledger_order_type_unique (order_code, entry_type),
      KEY reward_point_ledger_customer_idx (customer_email, created_at),
      CONSTRAINT reward_point_ledger_customer_fk FOREIGN KEY (customer_email)
        REFERENCES person(email) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  );
  await query(
    connection,
    `INSERT IGNORE INTO reward_account (customer_email)
     SELECT email FROM person WHERE person_type = 'Customer'`
  );

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
