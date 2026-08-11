require("dotenv").config({ path: __dirname + "/../.env" });
const mysql = require("mysql2/promise");

const START_DATE = "2026-08-11";
const END_DATE = "2026-08-18";

const TICKET_PRICES = {
  "Tiêu chuẩn": {
    "2D": 120000,
    "3D": 150000,
  },
  "Cao cấp": {
    "2D": 150000,
    "3D": 180000,
  }
};

const getDatesInRange = (startStr, endStr) => {
  const dates = [];
  let current = new Date(startStr);
  const end = new Date(endStr);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

// Helper để parse giờ phút thành chuỗi HH:MM
const formatTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

// Trả về thời gian bộ phim dạng phút từ string hoặc null
const parseDuration = (dur) => {
  if (!dur) return 100;
  const num = parseInt(dur, 10);
  return isNaN(num) || num <= 0 ? 100 : num;
};

const run = async () => {
  const requiredEnvironment = ["DB_HOST", "DB_USER", "DB_NAME"];
  const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);
  if (missingEnvironment.length > 0) {
    throw new Error(`Thiếu biến môi trường: ${missingEnvironment.join(", ")}`);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",
    timezone: process.env.DB_TIMEZONE || "+07:00",
  });

  try {
    await connection.query("SET time_zone = ?", [process.env.DB_SESSION_TIMEZONE || "+07:00"]);
    await connection.beginTransaction();

    console.log(`Đang dọn dẹp các suất chiếu trống từ ${START_DATE} đến ${END_DATE}...`);
    // Lấy các showtimes trong khoảng thời gian seed có liên kết vé đặt
    const [bookedShowtimes] = await connection.query(
      `SELECT DISTINCT showtimes_id FROM ticket WHERE ticket_status = 'ISSUED'`
    );
    const bookedIds = bookedShowtimes.map(row => row.showtimes_id);

    // Xóa shown_in trước, ngoại trừ các showtimes đã có vé đặt
    let deleteShownInSql = `DELETE FROM shown_in WHERE showtime_id IN (
      SELECT id FROM showtimes WHERE showtime_date BETWEEN ? AND ?
    )`;
    let deleteShowtimesSql = `DELETE FROM showtimes WHERE showtime_date BETWEEN ? AND ?`;
    const deleteParams = [START_DATE, END_DATE];

    if (bookedIds.length > 0) {
      deleteShownInSql = `DELETE FROM shown_in WHERE showtime_id IN (
        SELECT id FROM showtimes WHERE showtime_date BETWEEN ? AND ? AND id NOT IN (${bookedIds.join(",")})
      )`;
      deleteShowtimesSql = `DELETE FROM showtimes WHERE showtime_date BETWEEN ? AND ? AND id NOT IN (${bookedIds.join(",")})`;
    }

    const [delShownInResult] = await connection.query(deleteShownInSql, deleteParams);
    const [delShowtimesResult] = await connection.query(deleteShowtimesSql, deleteParams);
    console.log(`- Đã xóa ${delShownInResult.affectedRows} liên kết shown_in và ${delShowtimesResult.affectedRows} suất chiếu cũ.`);

    // Lấy danh sách rạp và phòng chiếu
    const [halls] = await connection.query(
      `SELECT h.id, h.name, h.theatre_id, h.screen_type, h.projection_capability, h.cleaning_buffer_minutes
       FROM hall h
       JOIN theatre t ON t.id = h.theatre_id
       WHERE h.status = 'active' AND t.status = 'active'`
    );

    // Lấy danh sách tất cả các phim
    const [movies] = await connection.query(
      `SELECT id, name, duration, release_date, end_date FROM movie`
    );

    if (movies.length === 0) {
      console.log("Không tìm thấy phim nào trong database để seed!");
      await connection.rollback();
      return;
    }

    const dates = getDatesInRange(START_DATE, END_DATE);
    console.log(`Bắt đầu seed suất chiếu từ ${START_DATE} đến ${END_DATE} (${dates.length} ngày)...`);

    let showtimesCreated = 0;

    for (const dateStr of dates) {
      const showDate = new Date(dateStr);

      // Lọc phim khả dụng cho ngày này
      const availableMovies = movies.filter(m => {
        const release = new Date(m.release_date);
        const end = m.end_date ? new Date(m.end_date) : null;
        return release <= showDate && (!end || end >= showDate);
      });

      if (availableMovies.length === 0) {
        console.log(`- Ngày ${dateStr}: Không có phim nào đang chiếu. Bỏ qua.`);
        continue;
      }

      for (const hall of halls) {
        let currentMinutes = 8 * 60 + 30; // Bắt đầu lúc 08:30 sáng (510 phút)
        const closeMinutes = 23 * 60 + 59; // Đóng cửa lúc 23:59 (1439 phút)
        const buffer = hall.cleaning_buffer_minutes || 15;

        // Phân phối phim trong phòng chiếu
        while (currentMinutes < 22 * 60 + 30) { // Suất chiếu cuối bắt đầu trước 22:30
          // Chọn ngẫu nhiên 1 phim đang chiếu
          const movie = availableMovies[Math.floor(Math.random() * availableMovies.length)];
          const movieDuration = parseDuration(movie.duration);

          // Nếu suất chiếu vượt quá giờ đóng cửa rạp thì dừng lại
          if (currentMinutes + movieDuration > closeMinutes) {
            break;
          }

          // Xác định show_type (2D hoặc 3D) dựa trên projection_capability của hall
          let showType = "2D";
          if (hall.projection_capability === "3D") {
            showType = "3D";
          } else if (hall.projection_capability === "BOTH") {
            showType = Math.random() > 0.85 ? "3D" : "2D"; // 85% chiếu 2D, 15% chiếu 3D
          }

          const screenType = hall.screen_type || "Tiêu chuẩn";
          const price = TICKET_PRICES[screenType]?.[showType] || 120000;
          const startTimeStr = formatTime(currentMinutes);

          // Thêm showtime mới
          const [stResult] = await connection.query(
            `INSERT INTO showtimes (movie_start_time, show_type, screen_type, showtime_date, price_per_seat, status)
             VALUES (?, ?, ?, ?, ?, 'active')`,
            [startTimeStr, showType, screenType, dateStr, price]
          );

          const showtimeId = stResult.insertId;

          // Thêm liên kết shown_in
          await connection.query(
            `INSERT INTO shown_in (movie_id, showtime_id, hall_id, status)
             VALUES (?, ?, ?, 'active')`,
            [movie.id, showtimeId, hall.id]
          );

          showtimesCreated++;

          // Tăng mốc thời gian cho suất chiếu tiếp theo
          currentMinutes += movieDuration + buffer;
        }
      }
      console.log(`- Ngày ${dateStr}: Đã seed xong cho các phòng chiếu.`);
    }

    await connection.commit();
    console.log(`Hoàn tất seed suất chiếu! Tổng số suất chiếu mới đã tạo: ${showtimesCreated}`);

  } catch (error) {
    await connection.rollback();
    console.error("Seed suất chiếu thất bại:", error);
  } finally {
    await connection.end();
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
