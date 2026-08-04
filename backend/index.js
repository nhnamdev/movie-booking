// Dưới đây là cách khởi tạo kết nối DB
// Import các module cần thiết
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger");
const { PayOS } = require("@payos/node");
// Import module dotenv để sử dụng biến môi trường
require("dotenv").config();

// Kiểm tra xem các biến môi trường đã được định nghĩa chưa
console.log("ENV loaded:");
console.log("DB_HOST =", process.env.DB_HOST);
console.log("DB_PORT =", process.env.DB_PORT);
console.log("DB_NAME =", process.env.DB_NAME);

// Khởi tạo cổng mặc định 7000
const port = process.env.PORT || 7000;
const registerDebugEnabled = process.env.DEBUG_REGISTER === "true";
const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(
  /\/+$/,
  ""
);
const defaultCorsOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
];
const corsOrigins = (process.env.CORS_ORIGINS || defaultCorsOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const maskEmail = (email = "") => {
  if (!email || !email.includes("@")) return email;
  const [name, domain] = email.split("@");
  if (!name) return `***@${domain}`;
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
};

const logRegisterDebug = (label, payload) => {
  if (!registerDebugEnabled) return;
  console.log(`[REGISTER DEBUG] ${label}:`, payload);
};

// Tạo một ứng dụng Express
const app = express();

// Sử dụng middleware CORS để cho phép truy cập từ các nguồn khác nhau
app.use(
  cors({
    //Chỉ định các địa chỉ frontend được phép gọi API từ backend
    origin: corsOrigins,
    methods: ["POST", "GET", "PUT", "DELETE"],
    credentials: true
  })
);

// Parse JSON bodies in the request
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api-docs.json", (req, res) => res.json(swaggerDocument));
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: "CGV Booking API Docs",
    swaggerOptions: { persistAuthorization: true },
  })
);

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
// Khởi tạo biến db để kết nối đến cơ sở dữ liệu
let db;
// Định nghĩa cấu hình kết nối đến cơ sở dữ liệu
const configuration = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

//  setting connection
function handleDisconnect() {
  db = mysql.createConnection(configuration);
// Hàm Kết nối đến cơ sở dữ liệu
  db.connect(function (err) {
    if (err) {
      // Hệ thống hiển thị thông báo: "Lỗi hệ thống. Vui lòng thử lại sau".
      console.log("error when connecting to db:", err);
      // Nếu có lỗi, thực hiện kết nối lại sau 2 giây
      setTimeout(handleDisconnect, 2000);
    } else {
      // Nếu kết nối thành công, hiển thị thông báo
      console.log("connection is successful");
    }
  });
  db.on("error", function (err) {
    console.log("db error", err);
    // Nếu lỗi do kết nối bị đứt, thực hiện kết nối lại
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}
// Gọi hàm kết nối đến cơ sở dữ liệu
handleDisconnect();

const queryDbAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

const getPayOSClient = () => {
  if (
    !process.env.PAYOS_CLIENT_ID ||
    !process.env.PAYOS_API_KEY ||
    !process.env.PAYOS_CHECKSUM_KEY
  ) {
    throw new Error("PayOS configuration is missing.");
  }

  return new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
  });
};

const getTodayDateKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parsePayOSOrderPayload = (payloadJson) => {
  try {
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
};

const generatePayOSOrderCode = () =>
  Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000);

const normalizeSeatIds = (seatIds) =>
  Array.isArray(seatIds)
    ? [...new Set(seatIds.map((seatId) => Number(seatId)).filter(Number.isInteger))]
    : [];

const getHeldOrderSeatIds = async ({ hallId, movieId, showtimeId }) => {
  const rows = await queryDbAsync(
    `SELECT order_code, status, payment_method, payload_json, created_at
     FROM payos_orders
     WHERE status IN ('UNPAID', 'PENDING')
       AND payment_id IS NULL`
  );
  const heldSeatIds = new Set();
  const now = Date.now();

  rows.forEach((row) => {
    const payload = parsePayOSOrderPayload(row.payload_json);
    if (
      !payload ||
      Number(payload.userHallId) !== Number(hallId) ||
      Number(payload.userMovieId) !== Number(movieId) ||
      Number(payload.userShowtimeId) !== Number(showtimeId)
    ) {
      return;
    }

    const status = String(row.status || "").toUpperCase();
    const method = row.payment_method || "PayOS";
    const createdAt = new Date(row.created_at).getTime();
    const payOSStillHolding =
      method === "PayOS" &&
      status === "PENDING" &&
      Number.isFinite(createdAt) &&
      now - createdAt <= 20 * 60 * 1000;

    if (status !== "UNPAID" && !payOSStillHolding) return;

    normalizeSeatIds(payload.seatIds).forEach((seatId) => heldSeatIds.add(seatId));
  });

  return heldSeatIds;
};

const buildPaymentOrderPayload = async ({
  email,
  seatIds,
  userHallId,
  userMovieId,
  userShowtimeId,
  paymentMethod,
}) => {
  const normalizedSeatIds = normalizeSeatIds(seatIds);
  const hallId = Number(userHallId);
  const movieId = Number(userMovieId);
  const showtimeId = Number(userShowtimeId);

  if (!email || normalizedSeatIds.length === 0 || !hallId || !movieId || !showtimeId) {
    const err = new Error("Dữ liệu thanh toán không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const showRows = await queryDbAsync(
    `SELECT
      S.price_per_seat,
      S.movie_start_time,
      DATE_FORMAT(S.showtime_date, '%Y-%m-%d') AS showtime_date,
      H.name AS hall_name,
      M.name AS movie_name
     FROM shown_in SI
     JOIN showtimes S ON SI.showtime_id = S.id
     JOIN hall H ON SI.hall_id = H.id
     JOIN movie M ON SI.movie_id = M.id
     WHERE SI.movie_id = ?
       AND SI.hall_id = ?
       AND SI.showtime_id = ?
       AND SI.status = 'active'
       AND S.status = 'active'
     LIMIT 1`,
    [movieId, hallId, showtimeId]
  );

  if (showRows.length === 0) {
    const err = new Error("Suất chiếu đã ngưng bán");
    err.statusCode = 409;
    throw err;
  }

  const availableSeats = await queryDbAsync(
    `SELECT S.id
     FROM seat S
     JOIN hallwise_seat HS ON S.id = HS.seat_id
     WHERE HS.hall_id = ?
       AND S.id IN (?)
       AND NOT EXISTS (
         SELECT 1
         FROM ticket T
         WHERE T.seat_id = S.id
           AND T.hall_id = ?
           AND T.movie_id = ?
           AND T.showtimes_id = ?
       )`,
    [hallId, normalizedSeatIds, hallId, movieId, showtimeId]
  );

  const heldSeatIds = await getHeldOrderSeatIds({ hallId, movieId, showtimeId });
  const selectedHeldSeatIds = normalizedSeatIds.filter((seatId) => heldSeatIds.has(seatId));

  if (
    availableSeats.length !== normalizedSeatIds.length ||
    selectedHeldSeatIds.length > 0
  ) {
    const err = new Error("Một hoặc nhiều ghế đã được đặt");
    err.statusCode = 409;
    throw err;
  }

  const seatPrice = Number(showRows[0].price_per_seat);
  const amount = seatPrice * normalizedSeatIds.length;

  return {
    amount,
    normalizedSeatIds,
    seatPrice,
    show: showRows[0],
    payload: {
      email,
      seatIds: normalizedSeatIds,
      userHallId: hallId,
      userMovieId: movieId,
      userShowtimeId: showtimeId,
      seatPrice,
      amount,
      paymentMethod,
      movieName: showRows[0].movie_name,
      hallName: showRows[0].hall_name,
      showtimeDate: showRows[0].showtime_date,
      movieStartTime: showRows[0].movie_start_time,
    },
  };
};

const ticketInsertSql = `
  INSERT INTO ticket (price,purchase_date,payment_id,seat_id,hall_id,movie_id,showtimes_id)
  SELECT ?, ?, ?, ?, ?, ?, ?
  FROM shown_in si
  JOIN showtimes s ON si.showtime_id = s.id
  WHERE si.movie_id = ?
    AND si.hall_id = ?
    AND si.showtime_id = ?
    AND si.status = 'active'
    AND s.status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM ticket t
      WHERE t.seat_id = ?
        AND t.hall_id = ?
        AND t.movie_id = ?
        AND t.showtimes_id = ?
    )
  LIMIT 1`;

const finalizePaymentOrderTickets = async (
  orderCode,
  { orderStatus = "PAID", paymentStatus = "PAID" } = {}
) => {
  const orderRows = await queryDbAsync(
    "SELECT * FROM payos_orders WHERE order_code = ?",
    [orderCode]
  );

  if (orderRows.length === 0) {
    const err = new Error("Không tìm thấy đơn thanh toán");
    err.statusCode = 404;
    throw err;
  }

  if (orderRows[0].payment_id && orderRows[0].ticket_ids_json) {
    const ticketIds = parsePayOSOrderPayload(orderRows[0].ticket_ids_json) || [];
    await queryDbAsync(
      "UPDATE payment SET payment_status = ? WHERE id = ?",
      [paymentStatus, orderRows[0].payment_id]
    );
    await queryDbAsync(
      "UPDATE payos_orders SET status = ?, error_message = NULL WHERE order_code = ?",
      [orderStatus, orderCode]
    );
    return ticketIds.map((id) => ({ id }));
  }

  let transactionStarted = false;

  try {
    await queryDbAsync("START TRANSACTION");
    transactionStarted = true;

    const lockedRows = await queryDbAsync(
      "SELECT * FROM payos_orders WHERE order_code = ? FOR UPDATE",
      [orderCode]
    );
    const lockedOrder = lockedRows[0];

    if (lockedOrder.payment_id && lockedOrder.ticket_ids_json) {
      const ticketIds = parsePayOSOrderPayload(lockedOrder.ticket_ids_json) || [];
      await queryDbAsync(
        "UPDATE payment SET payment_status = ? WHERE id = ?",
        [paymentStatus, lockedOrder.payment_id]
      );
      await queryDbAsync(
        "UPDATE payos_orders SET status = ?, error_message = NULL WHERE order_code = ?",
        [orderStatus, orderCode]
      );
      await queryDbAsync("COMMIT");
      transactionStarted = false;
      return ticketIds.map((id) => ({ id }));
    }

    const payload = parsePayOSOrderPayload(lockedOrder.payload_json);
    if (!payload || !Array.isArray(payload.seatIds) || payload.seatIds.length === 0) {
      throw new Error("Dữ liệu đơn thanh toán không hợp lệ");
    }

    const paymentMethod = lockedOrder.payment_method || payload.paymentMethod || "PayOS";
    const paymentResult = await queryDbAsync(
      "INSERT INTO payment(amount,method,customer_email,payment_status) VALUES(?,?,?,?)",
      [payload.amount, paymentMethod, payload.email, paymentStatus]
    );
    const paymentId = paymentResult.insertId;
    const ticketIds = [];

    for (const seatId of payload.seatIds) {
      const ticketResult = await queryDbAsync(ticketInsertSql, [
        payload.seatPrice,
        getTodayDateKey(),
        paymentId,
        seatId,
        payload.userHallId,
        payload.userMovieId,
        payload.userShowtimeId,
        payload.userMovieId,
        payload.userHallId,
        payload.userShowtimeId,
        seatId,
        payload.userHallId,
        payload.userMovieId,
        payload.userShowtimeId,
      ]);

      if (ticketResult.affectedRows === 0) {
        throw new Error("Suất chiếu đã ngưng bán hoặc ghế đã được đặt");
      }

      ticketIds.push(ticketResult.insertId);
    }

    await queryDbAsync(
      `UPDATE payos_orders
       SET status = ?, payment_id = ?, ticket_ids_json = ?, error_message = NULL
       WHERE order_code = ?`,
      [orderStatus, paymentId, JSON.stringify(ticketIds), orderCode]
    );

    await queryDbAsync("COMMIT");
    transactionStarted = false;

    return ticketIds.map((id) => ({ id }));
  } catch (err) {
    if (transactionStarted) {
      await queryDbAsync("ROLLBACK").catch(() => {});
    }

    await queryDbAsync(
      "UPDATE payos_orders SET status = 'FAILED', error_message = ? WHERE order_code = ? AND status <> 'PAID'",
      [err.desc || err.message, orderCode]
    ).catch(() => {});

    throw err;
  }
};

app.get("/", (req, res) => {
  return res.json("Hello Backend Side");
});


// /////
// HOME
// /////


app.get("/latestMovies", (req, res) => {
  const sql =
    "SELECT m.id, m.name, m.image_path, m.rating, m.duration, m.release_date as release_date, GROUP_CONCAT(g.genre SEPARATOR ', ') as genres FROM movie m INNER JOIN movie_genre g ON m.id = g.movie_id GROUP BY m.id ORDER BY release_date DESC LIMIT 6";

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

app.get("/locationDetails", (req, res) => {
  sql = "SELECT location_details FROM theatre";

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

app.get("/locationFeatures", (req, res) => {
  sql = "SELECT DISTINCT title,image_path,description FROM features";

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});


// /////////
// SHOWTIMES
// /////////


app.get("/theatres", (req, res) => {
  sql = "SELECT id, name,location FROM theatre";

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

//6.1.6. Hệ thống truy vẫn xuống cơ sỏ dữ liệu để lấy thông tin danh sách phim
app.post("/showtimes", (req, res) => {
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
});

//6.1.4. Hệ thống truy vấn xuống cơ sở dữ liệu để lấy thông tin về thể loại phim
app.get("/genres", (req, res) => {
  const sql = "SELECT DISTINCT genre FROM movie_genre";

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});


// /////////////
// PAYMENT PAGE
// /////////////


app.post("/showtimesDates", (req, res) => {
  const theatreId = req.body.theatreId;

  const sql = `SELECT DATE_FORMAT(subquery.showtime_date, '%Y-%m-%d') AS showtime_date
  FROM (
      SELECT showtimes.showtime_date, MAX(showtimes.id) AS latest_showtime_id
      FROM showtimes
      JOIN shown_in ON showtimes.id = shown_in.showtime_id
      JOIN hall ON shown_in.hall_id = hall.id
      WHERE hall.theatre_id = ?
        AND showtimes.status = 'active'
        AND shown_in.status = 'active'
      GROUP BY showtimes.showtime_date
      ORDER BY latest_showtime_id DESC
      LIMIT 4
  ) AS subquery
  ORDER BY subquery.showtime_date ASC`;

  db.query(sql, [theatreId], (err, data) => {
    if (err) return res.status(500).json({ message: "Could not load showtime dates" });

    return res.json(data);
  });
});

app.post("/uniqueMovies", (req, res) => {
  const theatreId = req.body.theatreId;
  const showtimeDate = req.body.userDate;

  const sql =
    "SELECT DISTINCT M.id,M.duration, M.name AS movie_name, M.image_path FROM movie M JOIN shown_in SI ON M.id = SI.movie_id JOIN showtimes S ON SI.showtime_id = S.id JOIN hall H ON SI.hall_id = H.id WHERE H.theatre_id = ? AND S.showtime_date = ? AND S.status = 'active' AND SI.status = 'active'";

  db.query(sql, [theatreId, showtimeDate], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

app.post("/halls", (req, res) => {
  const theatreId = req.body.theatreId;
  const showtimeDate = req.body.userDate;
  const movieId = req.body.userMovieId;

  const sql =
    "SELECT H.id AS hall_id, H.name AS hall_name, SI.showtime_id, S.show_type, S.screen_type, S.movie_start_time, S.price_per_seat FROM hall H JOIN shown_in SI ON H.id = SI.hall_id JOIN showtimes S ON SI.showtime_id = S.id WHERE H.theatre_id = ? AND S.showtime_date = ? AND SI.movie_id = ? AND S.status = 'active' AND SI.status = 'active'";
  db.query(sql, [theatreId, showtimeDate, movieId], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

app.post("/seats", async (req, res) => {
  const showtime_id = Number(req.body.userShowtimeId);
  const hall_id = Number(req.body.userHallId);
  const movie_id = Number(req.body.userMovieId);

  const sql = `SELECT
  S.id AS seat_id,
  S.name AS seat_name,
  CASE WHEN T.id IS NULL THEN TRUE ELSE FALSE END AS booked_status
FROM
  seat AS S
  JOIN hallwise_seat AS HS ON S.id = HS.seat_id
  JOIN shown_in AS SI ON HS.hall_id = SI.hall_id
  JOIN showtimes AS STIME ON SI.showtime_id = STIME.id
  LEFT JOIN ticket AS T ON
      T.seat_id = S.id AND
      T.showtimes_id = SI.showtime_id AND
      T.hall_id = SI.hall_id AND
      T.movie_id = SI.movie_id
WHERE
  SI.showtime_id = ? AND
  SI.hall_id = ? AND
  SI.movie_id = ? AND
  SI.status = 'active' AND
  STIME.status = 'active'
ORDER BY S.id`;

  try {
    const data = await queryDbAsync(sql, [showtime_id, hall_id, movie_id]);
    const heldSeatIds = await getHeldOrderSeatIds({
      hallId: hall_id,
      movieId: movie_id,
      showtimeId: showtime_id,
    });
    const seats = data.map((seat) => ({
      ...seat,
      booked_status: heldSeatIds.has(Number(seat.seat_id)) ? 0 : seat.booked_status,
    }));

    return res.json(seats);
  } catch (err) {
    console.error("Seats load error:", err);
    return res.status(500).json({ message: "Không thể tải danh sách ghế" });
  }
});

// ─── DEPRECATED LEGACY ENDPOINTS ─────────────────────────────────────────────
// Các endpoint cũ từ flow thanh toán gốc. Không còn được frontend gọi.
// Được thay thế bởi PayOS flow (/payos/*) và counter-orders flow.
// Giữ lại để không breaking nếu có integration cũ, nhưng yêu cầu admin auth.
const legacyEndpointGuard = (req, res, next) => {
  const { email, password } = req.body;
  verifyAdmin(email, password, (authErr, isAdmin) => {
    if (authErr) return res.status(500).json(authErr);
    if (!isAdmin) return adminAuthFailed(res);
    next();
  });
};

app.post("/payment", legacyEndpointGuard, (req, res) => {
  const amount = req.body.amount;
  const email = req.body.email;
  const paymentType = req.body.userPayMethod;

  const sql1 =
    "INSERT INTO payment(amount,method,customer_email) VALUES(?,?,?)";
  const sql2 = "SELECT LAST_INSERT_ID() as last_id";

  db.query(sql1, [amount, paymentType, email], (err1, data1) => {
    if (err1) return res.json(err1);

    db.query(sql2, (err2, data2) => {
      if (err2) return res.json(err2);

      return res.json(data2);
    });
  });
});

app.post("/purchaseTicket", legacyEndpointGuard, (req, res) => {
  const price = req.body.price;
  const date = req.body.purchase_date;
  const payment_id = req.body.paymentID;
  const seat_id = req.body.seatId;
  const hall_id = req.body.userHallId;
  const movie_id = req.body.userMovieId;
  const showtime_id = req.body.userShowtimeId;

  const sql = `
    INSERT INTO ticket (price,purchase_date,payment_id,seat_id,hall_id,movie_id,showtimes_id)
    SELECT ?, ?, ?, ?, ?, ?, ?
    FROM shown_in si
    JOIN showtimes s ON si.showtime_id = s.id
    WHERE si.movie_id = ?
      AND si.hall_id = ?
      AND si.showtime_id = ?
      AND si.status = 'active'
      AND s.status = 'active'
      AND NOT EXISTS (
        SELECT 1
        FROM ticket t
        WHERE t.seat_id = ?
          AND t.hall_id = ?
          AND t.movie_id = ?
          AND t.showtimes_id = ?
      )
    LIMIT 1`;

  db.query(
    sql,
    [
      price,
      date,
      payment_id,
      seat_id,
      hall_id,
      movie_id,
      showtime_id,
      movie_id,
      hall_id,
      showtime_id,
      seat_id,
      hall_id,
      movie_id,
      showtime_id,
    ],
    (err, data) => {
      if (err) return res.json(err);
      if (data.affectedRows === 0) {
        return res.status(409).json({
          message: "Suất chiếu đã ngưng bán hoặc ghế đã được đặt",
        });
      }

      return res.json(data);
    }
  );
});

app.post("/recentPurchase", legacyEndpointGuard, (req, res) => {
  const payment_id = req.body.paymentID;
  const sql = `SELECT id FROM ticket WHERE payment_id=?`;

  db.query(sql, [payment_id], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

app.post("/payos/create-payment-link", async (req, res) => {
  const { email, seatIds, userHallId, userMovieId, userShowtimeId } = req.body;

  try {
    const orderData = await buildPaymentOrderPayload({
      email,
      seatIds,
      userHallId,
      userMovieId,
      userShowtimeId,
      paymentMethod: "PayOS",
    });
    const payOS = getPayOSClient();
    const orderCode = generatePayOSOrderCode();
    const description = `CGV ${orderCode}`;
    const returnUrl = `${frontendUrl}/purchase?payosOrderCode=${orderCode}`;
    const cancelUrl = `${frontendUrl}/purchase?payosCancel=1&payosOrderCode=${orderCode}`;

    await queryDbAsync(
      `INSERT INTO payos_orders
        (order_code, status, amount, customer_email, payload_json, payment_method)
       VALUES (?, 'PENDING', ?, ?, ?, 'PayOS')`,
      [orderCode, orderData.amount, email, JSON.stringify(orderData.payload)]
    );

    try {
      const paymentLink = await payOS.paymentRequests.create({
        orderCode,
        amount: orderData.amount,
        description,
        buyerEmail: email,
        items: [
          {
            name: `Ve ${orderData.show.movie_name}`.slice(0, 80),
            quantity: orderData.normalizedSeatIds.length,
            price: orderData.seatPrice,
          },
        ],
        cancelUrl,
        returnUrl,
        expiredAt: Math.floor(Date.now() / 1000) + 15 * 60,
      });

      await queryDbAsync(
        `UPDATE payos_orders
         SET payment_link_id = ?, checkout_url = ?, status = ?
         WHERE order_code = ?`,
        [
          paymentLink.paymentLinkId,
          paymentLink.checkoutUrl,
          paymentLink.status || "PENDING",
          orderCode,
        ]
      );

      return res.json({ orderCode, checkoutUrl: paymentLink.checkoutUrl });
    } catch (err) {
      await queryDbAsync(
        "UPDATE payos_orders SET status = 'FAILED', error_message = ? WHERE order_code = ?",
        [err.desc || err.message, orderCode]
      ).catch(() => {});
      throw err;
    }
  } catch (err) {
    console.error("PayOS create payment link error:", err);
    return res.status(err.statusCode || 502).json({
      message:
        err.desc ||
        err.message ||
        "Không thể tạo link thanh toán PayOS",
      payosCode: err.code,
    });
  }
});

app.post("/counter-orders/create", async (req, res) => {
  const { email, seatIds, userHallId, userMovieId, userShowtimeId } = req.body;

  try {
    const orderData = await buildPaymentOrderPayload({
      email,
      seatIds,
      userHallId,
      userMovieId,
      userShowtimeId,
      paymentMethod: "Thanh toán tại rạp",
    });
    const orderCode = generatePayOSOrderCode();

    await queryDbAsync(
      `INSERT INTO payos_orders
        (order_code, status, amount, customer_email, payload_json, payment_method)
       VALUES (?, 'UNPAID', ?, ?, ?, 'Thanh toán tại rạp')`,
      [orderCode, orderData.amount, email, JSON.stringify(orderData.payload)]
    );

    const tickets = await finalizePaymentOrderTickets(orderCode, {
      orderStatus: "UNPAID",
      paymentStatus: "UNPAID",
    });

    return res.status(201).json({
      orderCode,
      status: "UNPAID",
      tickets,
      message: "Đã tạo vé thanh toán tại rạp",
    });
  } catch (err) {
    console.error("Counter order create error:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Không thể tạo vé thanh toán tại rạp",
    });
  }
});

app.post("/payos/confirm-return", async (req, res) => {
  const orderCode = Number(req.body.orderCode);

  if (!orderCode) {
    return res.status(400).json({ message: "Thiếu mã đơn PayOS" });
  }

  try {
    const payOS = getPayOSClient();
    const paymentLink = await payOS.paymentRequests.get(orderCode);

    await queryDbAsync(
      "UPDATE payos_orders SET status = ? WHERE order_code = ? AND status <> 'PAID'",
      [paymentLink.status, orderCode]
    );

    if (paymentLink.status !== "PAID") {
      return res.status(409).json({
        message: "Thanh toán PayOS chưa hoàn tất",
        status: paymentLink.status,
      });
    }

    const tickets = await finalizePaymentOrderTickets(orderCode);
    return res.json({ tickets });
  } catch (err) {
    console.error("PayOS confirm return error:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Không thể xác nhận thanh toán PayOS",
    });
  }
});

app.post("/payos/webhook", async (req, res) => {
  try {
    const payOS = getPayOSClient();
    const webhookData = await payOS.webhooks.verify(req.body);
    const orderCode = Number(webhookData.orderCode);

    if (!orderCode) return res.status(200).json({ ok: true });

    if (webhookData.code === "00") {
      await finalizePaymentOrderTickets(orderCode);
    } else {
      await queryDbAsync(
        "UPDATE payos_orders SET status = 'FAILED', error_message = ? WHERE order_code = ? AND status <> 'PAID'",
        [webhookData.desc || "PayOS webhook failed", orderCode]
      );
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("PayOS webhook error:", err);
    return res.status(400).json({ message: "Invalid PayOS webhook" });
  }
});


// ////////
// SIGN UP
// ////////


app.post("/registration", (req, res) => {
  const email = req.body.email;
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const password = req.body.password;
  const phoneNumber = String(req.body.phoneNumber || "").trim();

  logRegisterDebug("Incoming request", {
    method: req.method,
    path: req.originalUrl,
    origin: req.headers.origin,
    ip: req.ip,
  });

  logRegisterDebug("Payload summary", {
    email: maskEmail(email),
    firstName,
    lastName,
    phoneNumberLength: String(phoneNumber || "").length,
    hasPassword: Boolean(password),
    passwordLength: String(password || "").length,
  });

  if (!/^0\d{9}$/.test(phoneNumber)) {
    return res.status(400).json({
      message: "Số điện thoại Việt Nam phải bắt đầu bằng 0 và đủ 10 chữ số",
    });
  }

  const checkSql = "SELECT email FROM person WHERE email = ?";
  db.query(checkSql, [email], (checkErr, checkData) => {
    if (checkErr) {
      logRegisterDebug("Check email failed", checkErr);
      return res.status(500).json({ message: "Sorry, Please try again!" });
    }

    if (checkData.length > 0) {
      return res.status(409).json({
        message: "Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập.",
      });
    }

    const sql = `INSERT INTO person (email, first_name, last_name, password, phone_number, person_type) VALUES (?, ?, ?, ?, ?, 'Customer')`;

    logRegisterDebug("Executing SQL", {
      sql,
      paramsPreview: [maskEmail(email), firstName, lastName, "***", phoneNumber],
    });

    db.query(
      sql,
      [email, firstName, lastName, password, phoneNumber],
      (err, data) => {
        if (err) {
          logRegisterDebug("Insert failed", {
            message: err.message,
            code: err.code,
            errno: err.errno,
            sqlState: err.sqlState,
          });
          return res.status(500).json({ message: "Sorry, Please try again!" });
        }

        logRegisterDebug("Insert success", {
          affectedRows: data?.affectedRows,
          insertId: data?.insertId,
        });

        return res
          .status(200)
          .json({ message: "Chúc mừng! Tạo tài khoản thành công" });
      }
    );
  });
});



// Xử lý yêu cầu POST đến đường dẫn /login
app.post("/login", (req, res) => {
  // Lấy email và password từ body của request
  const email = req.body.email;
  const password = req.body.password;
  // 1.1.9	Thư viện ExpressJs thực hiện câu lệnh SELECT kiểm tra người dùng có tồn  trong bảng person hay không?
  const sql = `SELECT email, first_name, person_type, password FROM person WHERE email=? AND password=?`;

  db.query(sql, [email, password], (err, data) => {
    if (err) return res.json(err);
    // 1.2.6    Nếu người dùng không tồn tại Database trả về dữ liệu rỗng.
    if (data.length === 0) {
      //1.2.7    API nhận dữ liệu rỗng từ database trả về lỗi không tìm thấy user dưới dạng json.
      return res.status(404).json({ message: "Xin lỗi, tài khoản không tồn tại!" });
    }
   // 1.2.0	Nếu người dùng tồn tại Database trả về dữ liệu user.
   //1.2.1	API nhận được data tiếp tục trả về dữ liệu user dưới dạng json cho frontend.
    return res.json(data);
  });
});


// /////////////////
// MOVIEDETAILS PAGE
// /////////////////


app.post("/movieDetail", (req, res) => {
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
});

app.post("/movieWiseShowtime", (req, res) => {
  const movieId = req.body.movieDetailsId;
  const theatreId = req.body.theatreId;

  const sql = `SELECT S.id AS showtime_id, H.id AS hall_id, M.id AS movie_id, DATE_FORMAT(S.showtime_date, '%Y-%m-%d') AS showtime_date, S.movie_start_time, S.show_type, S.price_per_seat FROM theatre T JOIN hall H ON T.id = H.theatre_id JOIN shown_in SI ON H.id = SI.hall_id JOIN showtimes S ON SI.showtime_id = S.id JOIN movie M ON SI.movie_id = M.id JOIN ( SELECT s2.showtime_date FROM showtimes s2 JOIN shown_in si2 ON s2.id = si2.showtime_id WHERE s2.status = 'active' AND si2.status = 'active' GROUP BY s2.showtime_date ORDER BY s2.showtime_date DESC LIMIT 4 ) AS LatestDates ON S.showtime_date = LatestDates.showtime_date WHERE T.id = ? AND M.id = ? AND S.status = 'active' AND SI.status = 'active' ORDER BY S.showtime_date ASC`;

  db.query(sql, [theatreId, movieId], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

app.post("/otherMovies", (req, res) => {
  const movieId = req.body.movieDetailsId;

  sql =
    "SELECT m.id, m.name, m.image_path, m.rating, m.duration, m.release_date as release_date, GROUP_CONCAT(g.genre SEPARATOR ', ') as genres FROM movie m INNER JOIN movie_genre g ON m.id = g.movie_id GROUP BY m.id HAVING m.id!=?";

  db.query(sql, [movieId], (err, data) => {
    if (err) return res.json(err);

    return res.status(200).json(data);
  });
});


// ///////////////////
// CUSTOMER INFO PAGE
// ///////////////////


app.post("/customerProfile", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const sql = `SELECT * FROM person where email=? and password=?`;

  db.query(sql, [email, password], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});


app.post("/customerPurchases", (req, res) => {
  const email = req.body.email;

  const sql = `SELECT
  P.email AS customer_email,
  PA.id AS payment_id,
  PA.method AS payment_method,
  PA.payment_status AS payment_status,
  GROUP_CONCAT(T.id ORDER BY T.id SEPARATOR ', ') AS ticket_ids,
  GROUP_CONCAT(ST.name ORDER BY ST.id SEPARATOR ', ') AS seat_numbers,
  TH.name AS theatre_name,
  H.name AS hall_name,
  M.name AS movie_name,
  T.movie_id as movie_id,
  M.image_path AS movie_image,
  S.movie_start_time AS movie_start_time,
  S.show_type AS show_type,
  S.showtime_date AS showtime_date,
  PA.amount AS ticket_price,
  MIN(T.purchase_date) AS purchase_date
  FROM person P
  JOIN payment PA ON P.email = PA.customer_email
  JOIN ticket T ON PA.id = T.payment_id
  JOIN showtimes S ON T.showtimes_id = S.id
  JOIN movie M ON T.movie_id = M.id
  JOIN hall H ON T.hall_id = H.id
  JOIN theatre TH ON H.theatre_id = TH.id
  JOIN seat ST ON T.seat_id = ST.id
  WHERE P.email = ?
  GROUP BY
    P.email,
    PA.id,
    PA.method,
    PA.payment_status,
    TH.name,
    H.name,
    M.name,
    T.movie_id,
    M.image_path,
    S.movie_start_time,
    S.show_type,
    S.showtime_date,
    PA.amount
  ORDER BY payment_id DESC`;

  db.query(sql, [email], (err, data) => {
    if (err) {
      console.error("Customer purchases load error:", err);
      return res.status(500).json({ message: "Không thể tải lịch sử mua vé" });
    }

    return res.json(data);
  });
});


// /////
// ADMIN
// /////

// 12.1.14  Backend thêm phim vào data

const verifyAdmin = (email, password, callback) => {
  const sql = `SELECT email from person WHERE email = ? and password = ? and person_type = ?`;

  db.query(sql, [email, password, "Admin"], (err, data) => {
    if (err) return callback(err);
    return callback(null, data.length > 0);
  });
};

const adminAuthFailed = (res) =>
  res.status(403).json({ message: "Xin lỗi, bạn không phải là Admin!" });

const queryDb = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

const requireAdmin = (email, password) =>
  new Promise((resolve, reject) => {
    verifyAdmin(email, password, (err, isAdmin) => {
      if (err) return reject(err);
      return resolve(isAdmin);
    });
  });

const normalizeAdminList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const toAdminOrder = (order) => {
  const payload = parsePayOSOrderPayload(order.payload_json) || {};
  const ticketIds = parsePayOSOrderPayload(order.ticket_ids_json) || [];

  return {
    id: order.id,
    order_code: order.order_code,
    status: order.status,
    amount: order.amount,
    customer_email: order.customer_email,
    payment_method: order.payment_method || payload.paymentMethod || "PayOS",
    payment_status: order.payment_status || order.status,
    payment_id: order.payment_id,
    ticket_ids: ticketIds,
    seats: normalizeSeatIds(payload.seatIds),
    movie_name: payload.movieName || "",
    hall_name: payload.hallName || "",
    showtime_date: payload.showtimeDate || "",
    movie_start_time: payload.movieStartTime || "",
    error_message: order.error_message,
    checkout_url: order.checkout_url,
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
};

app.post("/adminOrders", async (req, res) => {
  const { email, password } = req.body;
  const statusFilter = String(req.body.status || "ALL").toUpperCase();

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const allowedStatuses = ["UNPAID", "PAID", "PENDING", "FAILED"];
    const whereSql = allowedStatuses.includes(statusFilter)
      ? "WHERE PO.status = ?"
      : "";
    const params = whereSql ? [statusFilter] : [];
    const rows = await queryDb(
      `SELECT
        PO.id,
        PO.order_code,
        PO.status,
        PO.amount,
        PO.customer_email,
        PO.payment_method,
        PA.payment_status,
        PO.payment_id,
        PO.ticket_ids_json,
        PO.payload_json,
        PO.error_message,
        PO.checkout_url,
        PO.created_at,
        PO.updated_at
       FROM payos_orders PO
       LEFT JOIN payment PA ON PO.payment_id = PA.id
       ${whereSql}
       ORDER BY PO.created_at DESC
       LIMIT 200`,
      params
    );

    return res.json(rows.map(toAdminOrder));
  } catch (err) {
    console.error("Admin orders load error:", err);
    return res.status(500).json({ message: "Không thể tải danh sách đơn hàng" });
  }
});

app.post("/adminOrderStatusUpdate", async (req, res) => {
  const { email, password } = req.body;
  const orderCode = Number(req.body.orderCode);
  const status = String(req.body.status || "").toUpperCase();

  if (!orderCode || !["UNPAID", "PAID"].includes(status)) {
    return res.status(400).json({ message: "Dữ liệu trạng thái đơn hàng không hợp lệ" });
  }

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const orderRows = await queryDb(
      "SELECT * FROM payos_orders WHERE order_code = ?",
      [orderCode]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const order = orderRows[0];

    if (status === "UNPAID") {
      if (order.payment_id) {
        await queryDb(
          "UPDATE payment SET payment_status = 'UNPAID' WHERE id = ?",
          [order.payment_id]
        );
      }
      await queryDb(
        "UPDATE payos_orders SET status = 'UNPAID', error_message = NULL WHERE order_code = ?",
        [orderCode]
      );
      const ticketIds = parsePayOSOrderPayload(order.ticket_ids_json) || [];
      return res.json({
        orderCode,
        status: "UNPAID",
        tickets: ticketIds.map((id) => ({ id })),
      });
    }

    const tickets = await finalizePaymentOrderTickets(orderCode);
    return res.json({ orderCode, status: "PAID", tickets });
  } catch (err) {
    console.error("Admin order status update error:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Không thể cập nhật trạng thái đơn hàng",
    });
  }
});

app.post("/adminMovies", (req, res) => {
  const { email, password } = req.body;

  verifyAdmin(email, password, (authErr, isAdmin) => {
    if (authErr) return res.status(500).json(authErr);
    if (!isAdmin) return adminAuthFailed(res);

    const sql = `
      SELECT
        m.id,
        m.name,
        m.image_path,
        m.language,
        m.synopsis,
        m.rating,
        m.duration,
        m.top_cast,
        m.release_date,
        GROUP_CONCAT(DISTINCT mg.genre ORDER BY mg.genre SEPARATOR ', ') AS genres,
        GROUP_CONCAT(DISTINCT md.director ORDER BY md.director SEPARATOR ', ') AS directors,
        COUNT(DISTINCT si.showtime_id) AS showtime_count,
        COUNT(DISTINCT t.id) AS ticket_count
      FROM movie m
      LEFT JOIN movie_genre mg ON m.id = mg.movie_id
      LEFT JOIN movie_directors md ON m.id = md.movie_id
      LEFT JOIN shown_in si ON m.id = si.movie_id
      LEFT JOIN ticket t ON m.id = t.movie_id
      GROUP BY m.id
      ORDER BY m.release_date DESC, m.id DESC
    `;

    db.query(sql, (err, data) => {
      if (err) return res.status(500).json(err);
      return res.json(data);
    });
  });
});

app.post("/adminMovieUpdate", async (req, res) => {
  const {
    email,
    password,
    movieId,
    name,
    image_path,
    language,
    synopsis,
    rating,
    duration,
    top_cast,
    release_date,
  } = req.body;
  const genres = normalizeAdminList(req.body.genres);
  const directors = normalizeAdminList(req.body.directors);

  verifyAdmin(email, password, async (authErr, isAdmin) => {
    if (authErr) return res.status(500).json(authErr);
    if (!isAdmin) return adminAuthFailed(res);

    if (!movieId || !name || !image_path || !language || !synopsis || !rating || !duration || !top_cast || !release_date) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin phim" });
    }

    try {
      await queryDb("START TRANSACTION");
      await queryDb(
        `UPDATE movie
         SET name = ?, image_path = ?, language = ?, synopsis = ?, rating = ?, duration = ?, top_cast = ?, release_date = ?
         WHERE id = ?`,
        [name, image_path, language, synopsis, rating, duration, top_cast, release_date, movieId]
      );
      await queryDb("DELETE FROM movie_genre WHERE movie_id = ?", [movieId]);
      await queryDb("DELETE FROM movie_directors WHERE movie_id = ?", [movieId]);

      for (const genre of genres) {
        await queryDb("INSERT INTO movie_genre(movie_id, genre) VALUES (?, ?)", [movieId, genre]);
      }

      for (const director of directors) {
        await queryDb("INSERT INTO movie_directors(movie_id, director) VALUES (?, ?)", [movieId, director]);
      }

      await queryDb("COMMIT");
      return res.json({ message: "Cập nhật phim thành công" });
    } catch (err) {
      await queryDb("ROLLBACK").catch(() => {});
      return res.status(500).json(err);
    }
  });
});

app.post("/adminMovieDelete", (req, res) => {
  const { email, password, movieId } = req.body;

  verifyAdmin(email, password, async (authErr, isAdmin) => {
    if (authErr) return res.status(500).json(authErr);
    if (!isAdmin) return adminAuthFailed(res);
    if (!movieId) return res.status(400).json({ message: "Thiếu mã phim" });

    try {
      const ticketRows = await queryDb("SELECT COUNT(*) AS ticketCount FROM ticket WHERE movie_id = ?", [movieId]);
      if (ticketRows[0].ticketCount > 0) {
        return res.status(409).json({
          message: "Không thể xoá phim đã có vé để tránh mất lịch sử mua vé",
        });
      }

      await queryDb("DELETE FROM movie WHERE id = ?", [movieId]);
      return res.json({ message: "Xoá phim thành công" });
    } catch (err) {
      return res.status(500).json(err);
    }
  });
});

app.post("/adminMovieAdd", (req, res) => {
  //admin revalidation
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  const name = req.body.name;
  const image_path = req.body.image_path;
  const language = req.body.language;
  const synopsis = req.body.synopsis;
  const rating = req.body.rating;
  const duration = req.body.duration;
  const top_cast = req.body.top_cast;
  const release_date = req.body.release_date;

  const sql1 = `Insert into movie (name,image_path,language,synopsis,rating,duration,top_cast,release_date)
  values
  (?,?,?,?,?,?,?,?)`;
  const sql2 = "SELECT LAST_INSERT_ID() as last_id";

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(
        sql1,
        [
          name,
          image_path,
          language,
          synopsis,
          rating,
          duration,
          top_cast,
          release_date,
        ],
        (err1, data1) => {
          if (err1) return res.json(err1);

          db.query(sql2, (err2, data2) => {
            if (err2) return res.json(err2);

            return res.json(data2);
          });
        }
    );
  });
});

app.post("/totalTickets", (req, res) => {
  const { email, password } = req.body;

  verifyAdmin(email, password, (authErr, isAdmin) => {
    if (authErr) return res.status(500).json(authErr);
    if (!isAdmin) return adminAuthFailed(res);

    const sql = `SELECT COUNT(*) AS total_tickets FROM ticket`;
    db.query(sql, (err, data) => {
      if (err) return res.json(err);
      return res.json(data);
    });
  });
});

app.post("/totalPayment", (req, res) => {
  const { email, password } = req.body;

  verifyAdmin(email, password, (authErr, isAdmin) => {
    if (authErr) return res.status(500).json(authErr);
    if (!isAdmin) return adminAuthFailed(res);

    const sql = `SELECT COALESCE(SUM(amount), 0) AS total_amount FROM payment`;
    db.query(sql, (err, data) => {
      if (err) return res.json(err);
      return res.json(data);
    });
  });
});

app.post("/totalCustomers", (req, res) => {
  const { email, password } = req.body;

  verifyAdmin(email, password, (authErr, isAdmin) => {
    if (authErr) return res.status(500).json(authErr);
    if (!isAdmin) return adminAuthFailed(res);

    const sql = `SELECT COUNT(*) AS total_customers FROM person WHERE person_type='Customer'`;
    db.query(sql, (err, data) => {
      if (err) return res.json(err);
      return res.json(data);
    });
  });
});

app.post("/totalTicketPerMovie", (req, res) => {
  const { email, password } = req.body;

  verifyAdmin(email, password, (authErr, isAdmin) => {
    if (authErr) return res.status(500).json(authErr);
    if (!isAdmin) return adminAuthFailed(res);

    const sql = `SELECT M.name,T.movie_id,COUNT(*) AS tickets_per_movie From ticket T JOIN movie M on T.movie_id = M.id GROUP BY movie_id`;
    db.query(sql, (err, data) => {
      if (err) return res.json(err);
      return res.json(data);
    });
  });
});

app.post("/genreInsert", (req, res) => {
  //admin revalidation
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  const movieId = req.body.movieId;
  const genre = req.body.genre;

  const sql = `Insert into movie_genre(movie_id,genre)
  values
  (?,?)`;

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql, [movieId, genre], (err, data) => {
      if (err) return res.json(err);

      return res.json(data);
    });
  });
});

app.post("/directorInsert", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  const movieId = req.body.movieId;
  const director = req.body.director;

  const sql = `Insert into movie_directors(movie_id,director)
  values
  (?,?)`;

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql, [movieId, director], (err, data) => {
      if (err) return res.json(err);

      return res.json(data);
    });
  });
});

app.get("/lastShowDate", (req, res) => {
  const sql = `SELECT max(showtime_date) as lastDate FROM showtimes`;

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

app.post("/showdateAdd", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  const showDate = req.body.selectedShowDate;
  const sql1 = `Insert into showtimes (movie_start_time,show_type,showtime_date,price_per_seat)
  values
  ('11:00 am','2D',?,350),
  ('2:30 pm','3D',?,450),
  ('6:00 pm','3D',?,450)`;

  const sql2 = "SELECT LAST_INSERT_ID() as last_id";

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql1, [showDate, showDate, showDate], (err1, data1) => {
      if (err1) return res.json(err1);

      db.query(sql2, (err2, data2) => {
        if (err2) return res.json(err2);

        return res.json(data2);
      });
    });
  });
});



app.post("/shownInUpdate", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  let showId = req.body.showtimeId;
  let showIdArr = [];

  for (let i = 1; i <= 24; i++) {
    if (i % 8 === 0) {
      showIdArr.push(showId);
      showId += 1;
    } else {
      showIdArr.push(showId);
    }
  }

  const sql = `Insert into shown_in(movie_id,showtime_id,hall_id)
  values
  (1,?,1),(5,?,2),(3,?,3),(4,?,4),(1,?,5),(5,?,6),(3,?,7),(4,?,8),
  (5,?,1),(6,?,2),(1,?,3),(2,?,4),(5,?,5),(6,?,6),(1,?,7),(2,?,8),
  (5,?,1),(6,?,2),(1,?,3),(2,?,4),(4,?,5),(6,?,6),(1,?,7),(2,?,8)`;

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql, showIdArr, (err, data) => {
      if (err) return res.json(err);

      return res.json(data);
    });
  });
});

app.get("/adminLatestShowDates", (req, res) => {
  const sql = `SELECT DISTINCT s.showtime_date
  FROM showtimes s
  JOIN (
      SELECT DISTINCT showtime_date
      FROM showtimes
      WHERE status = 'active'
      ORDER BY showtime_date DESC
      LIMIT 4
  ) latest_dates
  ON s.showtime_date = latest_dates.showtime_date
  WHERE s.status = 'active'
  ORDER BY s.showtime_date ASC
  `;

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

app.post("/adminShowtimes", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  const showdate = req.body.selectedShowDate;

  const sql = `SELECT id,movie_start_time,show_type FROM showtimes WHERE showtime_date=? AND status = 'active'`;

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql, [showdate], (err, data) => {
      if (err) return res.json(err);

      return res.json(data);
    });
  });
});

app.post("/movieReplaceFrom", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  const showtimeId = req.body.selectedShowtime;

  const sql = `SELECT DISTINCT M.name, Sh.movie_id FROM shown_in Sh JOIN movie M on Sh.movie_id=M.id WHERE Sh.showtime_id = ?`;

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql, [showtimeId], (err, data) => {
      if (err) return res.json(err);

      return res.json(data);
    });
  });
});

app.post("/movieReplaceTo", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  const showtimeId = req.body.selectedShowtime;

  const sql = `SELECT name, id FROM movie WHERE id NOT IN ( SELECT DISTINCT M.id FROM shown_in Sh JOIN movie M ON Sh.movie_id = M.id WHERE Sh.showtime_id = ? )`;

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql, [showtimeId], (err, data) => {
      if (err) return res.json(err);

      return res.json(data);
    });
  });
});

app.post("/movieSwap", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const sql0 = `SELECT * from person WHERE email = ? and password = ? and person_type = ?`;

  const updatedMovieId = req.body.selectedAlt;
  const showtime_id = req.body.selectedShowtime;
  const prevMovieId = req.body.selectedReplace;

  const sql = `UPDATE shown_in SET movie_id=? WHERE showtime_id=? AND movie_id=?`;

  db.query(sql0, [email, password, "Admin"], (err, data) => {
    if (err) return res.json(err);

    if (data.length === 0) {
      return res.status(404).json({ message: "Xin lỗi, bạn không phải là Admin!" });
    }

    db.query(sql, [updatedMovieId, showtime_id, prevMovieId], (err, data) => {
      if (err) return res.json(err);

      return res.json(data);
    });
  });
});
app.post("/adminScheduleDates", async (req, res) => {
  const { email, password } = req.body;

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const data = await queryDb(`
      SELECT
        s.showtime_date,
        COUNT(DISTINCT s.id) AS showtime_count,
        COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) AS active_showtime_count,
        COUNT(DISTINCT CASE WHEN s.status = 'cancelled' THEN s.id END) AS cancelled_showtime_count,
        COUNT(si.showtime_id) AS slot_count,
        SUM(CASE WHEN si.status = 'active' THEN 1 ELSE 0 END) AS active_slot_count,
        SUM(CASE WHEN si.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_slot_count,
        COUNT(DISTINCT t.id) AS ticket_count
      FROM showtimes s
      LEFT JOIN shown_in si ON s.id = si.showtime_id
      LEFT JOIN ticket t ON s.id = t.showtimes_id
      GROUP BY s.showtime_date
      ORDER BY s.showtime_date DESC
    `);

    return res.json(data);
  } catch (err) {
    return res.status(500).json(err);
  }
});

app.post("/adminScheduleDateAdd", async (req, res) => {
  const { email, password, showtimeDate } = req.body;

  if (!showtimeDate) {
    return res.status(400).json({ message: "Vui lòng chọn ngày chiếu" });
  }

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const existing = await queryDb(
      "SELECT COUNT(*) AS dateCount FROM showtimes WHERE showtime_date = ?",
      [showtimeDate]
    );
    if (existing[0]?.dateCount > 0) {
      return res.status(400).json({ message: "Ngày chiếu này đã tồn tại" });
    }

    await queryDb(
      `INSERT INTO showtimes (movie_start_time, show_type, screen_type, showtime_date, price_per_seat)
       VALUES
       ('09:30', '2D', 'Tiêu chuẩn', ?, 120000),
       ('14:00', '2D', 'Tiêu chuẩn', ?, 120000),
       ('19:30', '3D', 'Cao cấp', ?, 180000)`,
      [showtimeDate, showtimeDate, showtimeDate]
    );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json(err);
  }
});

app.post("/adminScheduleDateUpdate", async (req, res) => {
  const { email, password, currentDate, nextDate } = req.body;

  if (!currentDate || !nextDate) {
    return res.status(400).json({ message: "Vui lòng chọn ngày chiếu" });
  }

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const existing = await queryDb(
      "SELECT COUNT(*) AS dateCount FROM showtimes WHERE showtime_date = ? AND showtime_date <> ?",
      [nextDate, currentDate]
    );
    if (existing[0]?.dateCount > 0) {
      return res.status(400).json({ message: "Ngày chiếu mới đã tồn tại" });
    }

    const ticketRows = await queryDb(
      `SELECT COUNT(*) AS ticketCount
       FROM ticket t
       JOIN showtimes s ON t.showtimes_id = s.id
       WHERE s.showtime_date = ?`,
      [currentDate]
    );
    if (ticketRows[0]?.ticketCount > 0) {
      return res.status(409).json({
        message: "Không thể đổi ngày lịch chiếu đã có vé. Hãy huỷ/ngưng bán lịch này và tạo lịch mới.",
      });
    }

    await queryDb("UPDATE showtimes SET showtime_date = ? WHERE showtime_date = ?", [
      nextDate,
      currentDate,
    ]);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json(err);
  }
});

app.post("/adminScheduleDateDelete", async (req, res) => {
  const { email, password, showtimeDate } = req.body;

  if (!showtimeDate) {
    return res.status(400).json({ message: "Vui lòng chọn ngày chiếu" });
  }

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const ticketRows = await queryDb(
      `SELECT COUNT(*) AS ticketCount
       FROM ticket t
       JOIN showtimes s ON t.showtimes_id = s.id
       WHERE s.showtime_date = ?`,
      [showtimeDate]
    );
    await queryDb("START TRANSACTION");
    if (ticketRows[0]?.ticketCount > 0) {
      await queryDb(
        `UPDATE shown_in si
         JOIN showtimes s ON si.showtime_id = s.id
         SET si.status = 'cancelled'
         WHERE s.showtime_date = ?`,
        [showtimeDate]
      );
      await queryDb("UPDATE showtimes SET status = 'cancelled' WHERE showtime_date = ?", [
        showtimeDate,
      ]);
      await queryDb("COMMIT");
      return res.json({ success: true, cancelled: true });
    }

    await queryDb("DELETE FROM showtimes WHERE showtime_date = ?", [showtimeDate]);
    await queryDb("COMMIT");
    return res.json({ success: true, deleted: true });
  } catch (err) {
    await queryDb("ROLLBACK").catch(() => {});
    return res.status(500).json(err);
  }
});

app.post("/adminScheduleDateRestore", async (req, res) => {
  const { email, password, showtimeDate } = req.body;

  if (!showtimeDate) {
    return res.status(400).json({ message: "Vui lòng chọn ngày chiếu" });
  }

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    await queryDb("START TRANSACTION");
    await queryDb("UPDATE showtimes SET status = 'active' WHERE showtime_date = ?", [
      showtimeDate,
    ]);
    await queryDb(
      `UPDATE shown_in si
       JOIN showtimes s ON si.showtime_id = s.id
       SET si.status = 'active'
       WHERE s.showtime_date = ?`,
      [showtimeDate]
    );
    await queryDb("COMMIT");

    return res.json({ success: true, restored: true });
  } catch (err) {
    await queryDb("ROLLBACK").catch(() => {});
    return res.status(500).json(err);
  }
});

app.post("/adminShowtimeOptions", async (req, res) => {
  const { email, password } = req.body;

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const [movies, halls, showtimes] = await Promise.all([
      queryDb("SELECT id, name FROM movie ORDER BY name ASC"),
      queryDb(`
        SELECT h.id, h.name, h.theatre_id, t.name AS theatre_name
        FROM hall h
        JOIN theatre t ON h.theatre_id = t.id
        ORDER BY t.name ASC, h.id ASC
      `),
      queryDb(`
        SELECT id, movie_start_time, show_type, screen_type, showtime_date, price_per_seat, status
        FROM showtimes
        ORDER BY showtime_date DESC, movie_start_time ASC
      `),
    ]);

    return res.json({ movies, halls, showtimes });
  } catch (err) {
    return res.status(500).json(err);
  }
});

app.post("/adminShowtimeSlots", async (req, res) => {
  const { email, password, selectedShowDate } = req.body;

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const params = [];
    let whereSql = "";
    if (selectedShowDate) {
      whereSql = "WHERE s.showtime_date = ?";
      params.push(selectedShowDate);
    }

    const data = await queryDb(
      `
        SELECT
          si.movie_id,
          si.showtime_id,
          si.hall_id,
          m.name AS movie_name,
          h.name AS hall_name,
          th.name AS theatre_name,
          s.movie_start_time,
          s.show_type,
          s.screen_type,
          s.showtime_date,
          s.price_per_seat,
          s.status AS showtime_status,
          si.status AS slot_status,
          COUNT(t.id) AS ticket_count
        FROM shown_in si
        JOIN movie m ON si.movie_id = m.id
        JOIN hall h ON si.hall_id = h.id
        JOIN theatre th ON h.theatre_id = th.id
        JOIN showtimes s ON si.showtime_id = s.id
        LEFT JOIN ticket t
          ON t.movie_id = si.movie_id
          AND t.hall_id = si.hall_id
          AND t.showtimes_id = si.showtime_id
        ${whereSql}
        GROUP BY
          si.movie_id,
          si.showtime_id,
          si.hall_id,
          m.name,
          h.name,
          th.name,
          s.movie_start_time,
          s.show_type,
          s.screen_type,
          s.showtime_date,
          s.price_per_seat,
          s.status,
          si.status
        ORDER BY s.showtime_date DESC, s.movie_start_time ASC, th.name ASC, h.id ASC
      `,
      params
    );

    return res.json(data);
  } catch (err) {
    return res.status(500).json(err);
  }
});

app.post("/adminShowtimeCreate", async (req, res) => {
  const {
    email,
    password,
    movieId,
    hallId,
    showtimeDate,
    movieStartTime,
    showType,
    screenType,
    pricePerSeat,
  } = req.body;

  if (
    !movieId ||
    !hallId ||
    !showtimeDate ||
    !movieStartTime ||
    !showType ||
    !screenType ||
    !pricePerSeat
  ) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin suất chiếu" });
  }

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    await queryDb("START TRANSACTION");
    const insertResult = await queryDb(
      `INSERT INTO showtimes (movie_start_time, show_type, screen_type, showtime_date, price_per_seat, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [movieStartTime, showType, screenType, showtimeDate, pricePerSeat]
    );
    const showtimeId = insertResult.insertId;
    await queryDb(
      "INSERT INTO shown_in (movie_id, showtime_id, hall_id, status) VALUES (?, ?, ?, 'active')",
      [movieId, showtimeId, hallId]
    );
    await queryDb("COMMIT");

    return res.json({ success: true, showtimeId });
  } catch (err) {
    await queryDb("ROLLBACK").catch(() => {});
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Suất chiếu này đã tồn tại" });
    }
    return res.status(500).json(err);
  }
});

app.post("/adminShowtimeUpdate", async (req, res) => {
  const {
    email,
    password,
    originalMovieId,
    originalHallId,
    showtimeId,
    movieId,
    hallId,
    showtimeDate,
    movieStartTime,
    showType,
    screenType,
    pricePerSeat,
  } = req.body;

  if (
    !originalMovieId ||
    !originalHallId ||
    !showtimeId ||
    !movieId ||
    !hallId ||
    !showtimeDate ||
    !movieStartTime ||
    !showType ||
    !screenType ||
    !pricePerSeat
  ) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin suất chiếu" });
  }

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const ticketRows = await queryDb(
      `SELECT COUNT(*) AS ticketCount
       FROM ticket
       WHERE movie_id = ? AND hall_id = ? AND showtimes_id = ?`,
      [originalMovieId, originalHallId, showtimeId]
    );
    const changesSeatOwner =
      Number(originalMovieId) !== Number(movieId) ||
      Number(originalHallId) !== Number(hallId);
    const currentRows = await queryDb(
      "SELECT DATE_FORMAT(showtime_date, '%Y-%m-%d') AS showtime_date, movie_start_time, show_type, screen_type FROM showtimes WHERE id = ?",
      [showtimeId]
    );
    const currentShowtime = currentRows[0];
    const changesSoldSchedule =
      currentShowtime &&
      (String(currentShowtime.showtime_date).slice(0, 10) !== String(showtimeDate).slice(0, 10) ||
        String(currentShowtime.movie_start_time) !== String(movieStartTime) ||
        String(currentShowtime.show_type) !== String(showType) ||
        String(currentShowtime.screen_type) !== String(screenType));

    if (ticketRows[0]?.ticketCount > 0 && changesSeatOwner) {
      return res.status(400).json({
        message: "Không thể đổi phim hoặc phòng của suất chiếu đã có vé",
      });
    }
    if (ticketRows[0]?.ticketCount > 0 && changesSoldSchedule) {
      return res.status(409).json({
        message: "Không thể đổi ngày, giờ hoặc định dạng của suất đã có vé. Hãy huỷ/ngưng bán suất này và tạo suất mới.",
      });
    }

    await queryDb("START TRANSACTION");
    await queryDb(
      `UPDATE showtimes
       SET movie_start_time = ?, show_type = ?, screen_type = ?, showtime_date = ?, price_per_seat = ?
       WHERE id = ?`,
      [movieStartTime, showType, screenType, showtimeDate, pricePerSeat, showtimeId]
    );
    await queryDb(
      `UPDATE shown_in
       SET movie_id = ?, hall_id = ?
       WHERE movie_id = ? AND hall_id = ? AND showtime_id = ?`,
      [movieId, hallId, originalMovieId, originalHallId, showtimeId]
    );
    await queryDb("COMMIT");

    return res.json({ success: true });
  } catch (err) {
    await queryDb("ROLLBACK").catch(() => {});
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Suất chiếu này đã tồn tại" });
    }
    return res.status(500).json(err);
  }
});

app.post("/adminShowtimeDelete", async (req, res) => {
  const { email, password, movieId, hallId, showtimeId } = req.body;

  if (!movieId || !hallId || !showtimeId) {
    return res.status(400).json({ message: "Thiếu thông tin suất chiếu" });
  }

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const ticketRows = await queryDb(
      `SELECT COUNT(*) AS ticketCount
       FROM ticket
       WHERE movie_id = ? AND hall_id = ? AND showtimes_id = ?`,
      [movieId, hallId, showtimeId]
    );

    await queryDb("START TRANSACTION");
    if (ticketRows[0]?.ticketCount > 0) {
      await queryDb(
        "UPDATE shown_in SET status = 'cancelled' WHERE movie_id = ? AND hall_id = ? AND showtime_id = ?",
        [movieId, hallId, showtimeId]
      );
      const activeSlots = await queryDb(
        "SELECT COUNT(*) AS slotCount FROM shown_in WHERE showtime_id = ? AND status = 'active'",
        [showtimeId]
      );
      if (activeSlots[0]?.slotCount === 0) {
        await queryDb("UPDATE showtimes SET status = 'cancelled' WHERE id = ?", [
          showtimeId,
        ]);
      }
      await queryDb("COMMIT");
      return res.json({ success: true, cancelled: true });
    }

    await queryDb(
      "DELETE FROM shown_in WHERE movie_id = ? AND hall_id = ? AND showtime_id = ?",
      [movieId, hallId, showtimeId]
    );

    const remainingSlots = await queryDb(
      "SELECT COUNT(*) AS slotCount FROM shown_in WHERE showtime_id = ?",
      [showtimeId]
    );
    const remainingTickets = await queryDb(
      "SELECT COUNT(*) AS ticketCount FROM ticket WHERE showtimes_id = ?",
      [showtimeId]
    );
    if (remainingSlots[0]?.slotCount === 0 && remainingTickets[0]?.ticketCount === 0) {
      await queryDb("DELETE FROM showtimes WHERE id = ?", [showtimeId]);
    }
    await queryDb("COMMIT");

    return res.json({ success: true });
  } catch (err) {
    await queryDb("ROLLBACK").catch(() => {});
    return res.status(500).json(err);
  }
});

app.post("/adminShowtimeRestore", async (req, res) => {
  const { email, password, movieId, hallId, showtimeId } = req.body;

  if (!movieId || !hallId || !showtimeId) {
    return res.status(400).json({ message: "Thiếu thông tin suất chiếu" });
  }

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    await queryDb("START TRANSACTION");
    await queryDb("UPDATE showtimes SET status = 'active' WHERE id = ?", [
      showtimeId,
    ]);
    await queryDb(
      "UPDATE shown_in SET status = 'active' WHERE movie_id = ? AND hall_id = ? AND showtime_id = ?",
      [movieId, hallId, showtimeId]
    );
    await queryDb("COMMIT");

    return res.json({ success: true, restored: true });
  } catch (err) {
    await queryDb("ROLLBACK").catch(() => {});
    return res.status(500).json(err);
  }
});

// API huỷ vé theo ticket ID
app.post("/cancelOneTicket", (req, res) => {
  const ticketId = req.body.ticketId;
  const sql = "DELETE FROM ticket WHERE id = ?";
  db.query(sql, [ticketId], (err, result) => {
    if (err) return res.json({ success: false });
    return res.json({ success: true });
  });
});


// Registration endpoint (deprecated - table `users` does not exist)
// app.post('/api/register', ...) removed to prevent 500 errors

// ─── DASHBOARD STATS ENDPOINTS ────────────────────────────────────────────────

app.post("/adminDashboardStats", async (req, res) => {
  const { email, password } = req.body;

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const [totalRevenue, totalTickets, totalMovies, totalShowtimesToday, totalUsers, totalOrders] = await Promise.all([
      queryDb("SELECT COALESCE(SUM(amount),0) AS value FROM payment"),
      queryDb("SELECT COUNT(*) AS value FROM ticket"),
      queryDb("SELECT COUNT(*) AS value FROM movie"),
      queryDb(`SELECT COUNT(*) AS value FROM shown_in si JOIN showtimes s ON si.showtime_id = s.id WHERE s.showtime_date = CURDATE() AND si.status = 'active' AND s.status = 'active'`),
      queryDb("SELECT COUNT(*) AS value FROM person WHERE person_type = 'Customer'"),
      queryDb("SELECT COUNT(*) AS value FROM payos_orders"),
    ]);

    return res.json({
      totalRevenue: Number(totalRevenue[0]?.value || 0),
      totalTickets: Number(totalTickets[0]?.value || 0),
      totalMovies: Number(totalMovies[0]?.value || 0),
      totalShowtimesToday: Number(totalShowtimesToday[0]?.value || 0),
      totalUsers: Number(totalUsers[0]?.value || 0),
      totalOrders: Number(totalOrders[0]?.value || 0),
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return res.status(500).json({ message: "Không thể tải thống kê" });
  }
});

app.post("/adminRevenueStats", async (req, res) => {
  const { email, password } = req.body;

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const revenueByDate = await queryDb(
      `SELECT DATE(purchase_date) AS date, SUM(price) AS revenue
       FROM ticket
       WHERE purchase_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(purchase_date)
       ORDER BY date ASC`
    );

    if (revenueByDate.length === 0) {
      const mockData = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        mockData.push({ date: dateStr, revenue: Math.floor(Math.random() * 5000000) + 500000 });
      }
      return res.json(mockData);
    }

    return res.json(revenueByDate);
  } catch (err) {
    console.error("Revenue stats error:", err);
    return res.status(500).json({ message: "Không thể tải doanh thu" });
  }
});

app.post("/adminOrderStatusStats", async (req, res) => {
  const { email, password } = req.body;

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const statusStats = await queryDb(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END), 0) AS paid,
        COALESCE(SUM(CASE WHEN status IN ('UNPAID','PENDING') THEN 1 ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END), 0) AS failed
       FROM payos_orders`
    );

    const row = statusStats[0] || { paid: 0, pending: 0, failed: 0 };
    const total = Number(row.paid) + Number(row.pending) + Number(row.failed);

    if (total === 0) {
      return res.json([
        { name: "Đã thanh toán", value: 65 },
        { name: "Chờ thanh toán", value: 20 },
        { name: "Đã hủy", value: 15 },
      ]);
    }

    return res.json([
      { name: "Đã thanh toán", value: Number(row.paid) },
      { name: "Chờ thanh toán", value: Number(row.pending) },
      { name: "Đã hủy", value: Number(row.failed) },
    ]);
  } catch (err) {
    console.error("Order status stats error:", err);
    return res.status(500).json({ message: "Không thể tải trạng thái đơn" });
  }
});

app.post("/adminBookingTimeStats", async (req, res) => {
  const { email, password } = req.body;

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const timeStats = await queryDb(
      `SELECT
        CASE
          WHEN TIME(s.movie_start_time) >= '06:00' AND TIME(s.movie_start_time) < '12:00' THEN 'Sáng (6h-12h)'
          WHEN TIME(s.movie_start_time) >= '12:00' AND TIME(s.movie_start_time) < '18:00' THEN 'Chiều (12h-18h)'
          ELSE 'Tối (18h-24h)'
        END AS time_slot,
        COUNT(t.id) AS bookings
       FROM ticket t
       JOIN showtimes s ON t.showtimes_id = s.id
       GROUP BY time_slot
       ORDER BY time_slot`
    );

    if (timeStats.length === 0) {
      return res.json([
        { time: "Sáng (6h-12h)", bookings: 85 },
        { time: "Chiều (12h-18h)", bookings: 120 },
        { time: "Tối (18h-24h)", bookings: 210 },
      ]);
    }

    return res.json(timeStats.map(r => ({ time: r.time_slot, bookings: Number(r.bookings) })));
  } catch (err) {
    console.error("Booking time stats error:", err);
    return res.status(500).json({ message: "Không thể tải thống kê giờ chiếu" });
  }
});

app.post("/adminRecentOrders", async (req, res) => {
  const { email, password } = req.body;

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const rows = await queryDb(
      `SELECT
        PO.order_code,
        PO.status,
        PO.amount,
        PO.customer_email,
        PO.payment_method,
        PO.payment_id,
        PO.ticket_ids_json,
        PO.payload_json,
        PO.created_at
       FROM payos_orders PO
       ORDER BY PO.created_at DESC
       LIMIT 10`
    );

    const orders = rows.map(toAdminOrder);
    return res.json(orders);
  } catch (err) {
    console.error("Recent orders error:", err);
    return res.status(500).json({ message: "Không thể tải đơn gần đây" });
  }
});

app.post("/adminTopMovies", async (req, res) => {
  const { email, password } = req.body;

  try {
    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    const topMovies = await queryDb(
      `SELECT M.id, M.name, M.image_path, M.rating, COUNT(T.id) AS tickets_sold
       FROM movie M
       LEFT JOIN ticket T ON M.id = T.movie_id
       GROUP BY M.id, M.name, M.image_path, M.rating
       ORDER BY tickets_sold DESC
       LIMIT 10`
    );

    if (topMovies.length === 0) {
      return res.json([
        { id: 1, name: "Avengers: Endgame", image_path: "", rating: 8.7, tickets_sold: 120 },
        { id: 2, name: "Inception", image_path: "", rating: 8.8, tickets_sold: 95 },
        { id: 3, name: "Interstellar", image_path: "", rating: 8.6, tickets_sold: 88 },
        { id: 4, name: "The Dark Knight", image_path: "", rating: 9.0, tickets_sold: 72 },
        { id: 5, name: "Parasite", image_path: "", rating: 8.5, tickets_sold: 60 },
      ]);
    }

    return res.json(topMovies.map(r => ({
      id: r.id,
      name: r.name,
      image_path: r.image_path,
      rating: Number(r.rating),
      tickets_sold: Number(r.tickets_sold),
    })));
  } catch (err) {
    console.error("Top movies error:", err);
    return res.status(500).json({ message: "Không thể tải top phim" });
  }
});

const { uploadToR2, generateFileName } = require("./r2Config");

app.post("/adminUploadImage", upload.single("image"), async (req, res) => {
  try {
    const { email, password } = req.body;

    const isAdmin = await requireAdmin(email, password);
    if (!isAdmin) return adminAuthFailed(res);

    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn ảnh" });
    }

    const fileName = generateFileName(req.file.originalname);
    const publicUrl = await uploadToR2({
      buffer: req.file.buffer,
      fileName,
      mimeType: req.file.mimetype,
    });

    return res.json({ url: publicUrl, fileName });
  } catch (err) {
    console.error("Upload image error:", err);
    return res.status(500).json({ message: "Không thể tải ảnh lên" });
  }
});

// For local usage
app.listen(port, () => {
  console.log(` backend running on ${port}`);
});
