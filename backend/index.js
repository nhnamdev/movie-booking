// Dưới đây là cách khởi tạo kết nối DB
// Import các module cần thiết
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
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
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["POST", "GET", "PUT", "DELETE"],
    credentials: true
  })
);

// Parse JSON bodies in the request
app.use(express.json());
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
  // Cập nhật db reference trong app context (cho AI routes truy cập)
  app.set("db", db);
}
// Gọi hàm kết nối đến cơ sở dữ liệu
handleDisconnect();

// ─── AI ROUTES ──────────────────────────────────────────────────────────────
// Mount các endpoint AI dưới prefix /ai (chatbot, recommendations, search, admin)
try {
  const aiRoutes = require("./ai/routes");
  app.use("/ai", aiRoutes);
  console.log("AI routes loaded at /ai");
} catch (err) {
  console.warn("AI routes not loaded:", err.message);
}

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

  sql1 = `SELECT M.id, M.name AS movie_name, M.image_path, S.showtime_date, S.movie_start_time, S.show_type, MG.genre FROM theatre T JOIN hall H ON T.id = H.theatre_id JOIN shown_in SI ON H.id = SI.hall_id JOIN showtimes S ON SI.showtime_id = S.id JOIN movie M ON SI.movie_id = M.id JOIN movie_genre MG ON MG.movie_id = M.id JOIN ( SELECT DISTINCT showtime_date FROM showtimes ORDER BY showtime_date DESC LIMIT 4 ) AS LatestDates ON S.showtime_date = LatestDates.showtime_date WHERE T.name =? and MG.genre=? ORDER BY S.showtime_date ASC`;

  sql2 = `SELECT M.id, M.name AS movie_name, M.image_path, S.showtime_date, S.movie_start_time, S.show_type, MG.genre FROM theatre T JOIN hall H ON T.id = H.theatre_id JOIN shown_in SI ON H.id = SI.hall_id JOIN showtimes S ON SI.showtime_id = S.id JOIN movie M ON SI.movie_id = M.id JOIN movie_genre MG ON MG.movie_id = M.id JOIN ( SELECT DISTINCT showtime_date FROM showtimes ORDER BY showtime_date DESC LIMIT 4 ) AS LatestDates ON S.showtime_date = LatestDates.showtime_date WHERE T.name =?  ORDER BY S.showtime_date ASC`;

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

  const sql = `SELECT subquery.showtime_date
  FROM (
      SELECT DISTINCT showtimes.showtime_date
      FROM showtimes
      JOIN shown_in ON showtimes.id = shown_in.showtime_id
      JOIN hall ON shown_in.hall_id = hall.id
      WHERE hall.theatre_id = ?
      ORDER BY showtimes.id DESC
      LIMIT 4
  ) AS subquery
  ORDER BY subquery.showtime_date ASC`;

  db.query(sql, [theatreId], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

app.post("/uniqueMovies", (req, res) => {
  const theatreId = req.body.theatreId;
  const showtimeDate = req.body.userDate;

  const sql =
    "SELECT DISTINCT M.id,M.duration, M.name AS movie_name, M.image_path FROM movie M JOIN shown_in SI ON M.id = SI.movie_id JOIN showtimes S ON SI.showtime_id = S.id JOIN hall H ON SI.hall_id = H.id WHERE H.theatre_id = ? AND S.showtime_date = ?";

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
    "SELECT H.id AS hall_id, H.name AS hall_name, SI.showtime_id, S.show_type,S.movie_start_time, S.price_per_seat FROM hall H JOIN shown_in SI ON H.id = SI.hall_id JOIN showtimes S ON SI.showtime_id = S.id WHERE H.theatre_id = ? AND S.showtime_date = ? AND SI.movie_id = ?";
  db.query(sql, [theatreId, showtimeDate, movieId], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

app.post("/seats", (req, res) => {
  const showtime_id = req.body.userShowtimeId;
  const hall_id = req.body.userHallId;
  const movie_id = req.body.userMovieId;

  const sql = `SELECT
  S.id AS seat_id,
  S.name AS seat_name,
  CASE WHEN T.id IS NULL THEN TRUE ELSE FALSE END AS booked_status
FROM
  seat AS S
  JOIN hallwise_seat AS HS ON S.id = HS.seat_id
  JOIN shown_in AS SI ON HS.hall_id = SI.hall_id
  LEFT JOIN ticket AS T ON
      T.seat_id = S.id AND
      T.showtimes_id = SI.showtime_id AND
      T.hall_id = SI.hall_id AND
      T.movie_id = SI.movie_id
WHERE
  SI.showtime_id = ? AND
  SI.hall_id = ? AND
  SI.movie_id = ?
ORDER BY S.id`;

  db.query(sql, [showtime_id, hall_id, movie_id], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

app.post("/payment", (req, res) => {
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

app.post("/purchaseTicket", (req, res) => {
  const price = req.body.price;
  const date = req.body.purchase_date;
  const payment_id = req.body.paymentID;
  const seat_id = req.body.seatId;
  const hall_id = req.body.userHallId;
  const movie_id = req.body.userMovieId;
  const showtime_id = req.body.userShowtimeId;

  const sql =
    "INSERT INTO ticket (price,purchase_date,payment_id,seat_id,hall_id,movie_id,showtimes_id) VALUES (?,?,?,?,?,?,?)";

  db.query(
    sql,
    [price, date, payment_id, seat_id, hall_id, movie_id, showtime_id],
    (err, data) => {
      if (err) return res.json(err);

      return res.json(data);
    }
  );
});

app.post("/recentPurchase", (req, res) => {
  const payment_id = req.body.paymentID;
  const sql = `SELECT id FROM ticket WHERE payment_id=?`;

  db.query(sql, [payment_id], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
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

  const sql = `SELECT S.id AS showtime_id, H.id AS hall_id, M.id AS movie_id, S.showtime_date, S.movie_start_time, S.show_type, S.price_per_seat FROM theatre T JOIN hall H ON T.id = H.theatre_id JOIN shown_in SI ON H.id = SI.hall_id JOIN showtimes S ON SI.showtime_id = S.id JOIN movie M ON SI.movie_id = M.id JOIN ( SELECT DISTINCT showtime_date FROM showtimes ORDER BY showtime_date DESC LIMIT 4 ) AS LatestDates ON S.showtime_date = LatestDates.showtime_date WHERE T.id = ? AND M.id = ? ORDER BY S.showtime_date ASC`;

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
  GROUP_CONCAT(T.id SEPARATOR ', ') AS ticket_ids,
  GROUP_CONCAT(ST.name SEPARATOR ', ') AS seat_numbers,
  TH.name AS theatre_name,
  H.name AS hall_name,
  M.name AS movie_name,
  T.movie_id as movie_id,
  M.image_path AS movie_image,
  S.movie_start_time AS movie_start_time,
  S.show_type AS show_type,
  S.showtime_date AS showtime_date,
  PA.amount AS ticket_price,
  T.purchase_date AS purchase_date
  FROM person P
  JOIN payment PA ON P.email = PA.customer_email
  JOIN ticket T ON PA.id = T.payment_id
  JOIN showtimes S ON T.showtimes_id = S.id
  JOIN movie M ON T.movie_id = M.id
  JOIN hall H ON T.hall_id = H.id
  JOIN theatre TH ON H.theatre_id = TH.id
  JOIN seat ST ON T.seat_id = ST.id
  WHERE P.email = ?
  GROUP BY PA.id 
  ORDER BY payment_id DESC`;

  db.query(sql, [email], (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});


// /////
// ADMIN
// /////

// 12.1.14  Backend thêm phim vào data

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

app.get("/totalTickets", (req, res) => {
  const sql = `SELECT COUNT(*) AS total_tickets FROM ticket`;

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

app.get("/totalPayment", (req, res) => {
  const sql = `SELECT sum(amount) AS total_amount FROM payment`;

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

app.get("/totalCustomers", (req, res) => {
  const sql = `SELECT COUNT(*) AS total_customers FROM person WHERE person_type='Customer'`;

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

app.get("/totalTicketPerMovie", (req, res) => {
  const sql = `SELECT M.name,T.movie_id,COUNT(*) AS tickets_per_movie From ticket T JOIN movie M on T.movie_id = M.id GROUP BY movie_id`;

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
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

app.post("/adminMovieAdd1", (req, res) => {
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

app.post("/genreInsert1", (req, res) => {
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

app.post("/directorInsert1", (req, res) => {
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

app.get("/lastShowDate1", (req, res) => {
  const sql = `SELECT max(showtime_date) as lastDate FROM showtimes`;

  db.query(sql, (err, data) => {
    if (err) return res.json(err);

    return res.json(data);
  });
});

app.post("/showdateAdd1", (req, res) => {
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
      ORDER BY showtime_date DESC
      LIMIT 4
  ) latest_dates
  ON s.showtime_date = latest_dates.showtime_date
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

  const sql = `SELECT id,movie_start_time,show_type FROM showtimes WHERE showtime_date=?`;

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
// API huỷ vé theo ticket ID
app.post("/cancelOneTicket", (req, res) => {
  const ticketId = req.body.ticketId;
  const sql = "DELETE FROM ticket WHERE id = ?";
  db.query(sql, [ticketId], (err, result) => {
    if (err) return res.json({ success: false });
    return res.json({ success: true });
  });
});


// Registration endpoint
app.post('/api/register', (req, res) => {
    const { username, email, password, full_name, phone_number } = req.body;

    // Validate input
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email và password là bắt buộc' });
    }

    // Check if user already exists
    const checkUserQuery = 'SELECT * FROM users WHERE username = ? OR email = ?';
    db.query(checkUserQuery, [username, email], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length > 0) {
            return res.status(400).json({ error: 'Username hoặc email đã tồn tại' });
        }

        // Hash password (you should use bcrypt in production)
        const hashedPassword = password; // In production, use bcrypt.hash()

        // Insert new user
        const insertUserQuery = 'INSERT INTO users (username, email, password, full_name, phone_number) VALUES (?, ?, ?, ?, ?)';
        db.query(insertUserQuery, [username, email, hashedPassword, full_name, phone_number], (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Tạo tài khoản thất bại' });
            }

            res.status(201).json({
                message: 'Đăng kí tài khoản thành công',
                userId: result.insertId
            });
        });
    });
});

// For local usage
app.listen(port, () => {
  console.log(` backend running on ${port}`);
});
