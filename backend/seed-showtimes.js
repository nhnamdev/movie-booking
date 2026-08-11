const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { connectDatabase, query, withTransaction } = require("./services/databaseService");

// Cấu hình giá vé chuẩn theo showtimeAvailabilityService
const TICKET_PRICE_BY_ROOM = {
  "Tiêu chuẩn": { "2D": 120000, "3D": 150000 },
  "Cao cấp": { "2D": 150000, "3D": 180000 },
};

function parseDurationMinutes(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (/^\d+$/.test(normalized)) return Number(normalized);

  const hourMinuteMatch = normalized.match(/^(\d+)\s*h(?:\s*(\d+)\s*m?)?$/);
  if (hourMinuteMatch) {
    return Number(hourMinuteMatch[1]) * 60 + Number(hourMinuteMatch[2] || 0);
  }
  return 100; // Mặc định 100 phút nếu không parse được hoặc null
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

async function main() {
  connectDatabase();

  console.log("Starting showtime seeding process...");

  // 1. Lấy thông tin phim, rạp và phòng chiếu
  const movies = await query("SELECT id, name, release_date, end_date, duration FROM movie");
  const halls = await query(`
    SELECT H.id, H.name, H.screen_type, H.projection_capability, H.cleaning_buffer_minutes,
           T.id as theatre_id, T.name as theatre_name, T.opening_time, T.closing_time
    FROM hall H
    JOIN theatre T ON H.theatre_id = T.id
    WHERE H.status = 'active' AND T.status = 'active'
  `);

  if (movies.length === 0) {
    console.error("No movies found in the database. Cannot seed showtimes.");
    process.exit(1);
  }

  if (halls.length === 0) {
    console.error("No active halls/theatres found in the database. Cannot seed showtimes.");
    process.exit(1);
  }

  // 2. Xác định các ngày cần seed (7 ngày từ hôm nay: 2026-08-11 đến 2026-08-17)
  const startDateStr = "2026-08-11";
  const numDays = 7;
  const dates = [];
  const start = new Date(startDateStr);
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  console.log(`Seeding showtimes for dates: ${dates.join(", ")}`);

  // Bắt đầu một transaction để đảm bảo tính toàn vẹn dữ liệu
  const tx = await withTransaction();
  try {
    // 3. Xoá các suất chiếu cũ từ ngày 2026-08-11 trở đi mà CHƯA có vé đặt (ticket)
    // Để làm việc này, ta tìm các showtime_id từ 2026-08-11 trở đi có ticket, sau đó xoá các showtimes không nằm trong danh sách này
    const ticketShowtimeRows = await tx.query(`
      SELECT DISTINCT showtimes_id FROM ticket WHERE purchase_date >= ?
    `, [startDateStr]);
    const activeShowtimeIdsWithTickets = ticketShowtimeRows.map(r => r.showtimes_id);

    console.log(`Found ${activeShowtimeIdsWithTickets.length} showtimes with tickets. Keeping them.`);

    // Xoá shown_in liên quan
    if (activeShowtimeIdsWithTickets.length > 0) {
      await tx.query(`
        DELETE FROM shown_in
        WHERE showtime_id IN (
          SELECT id FROM showtimes WHERE showtime_date >= ? AND id NOT IN (?)
        )
      `, [startDateStr, activeShowtimeIdsWithTickets]);

      await tx.query(`
        DELETE FROM showtimes
        WHERE showtime_date >= ? AND id NOT IN (?)
      `, [startDateStr, activeShowtimeIdsWithTickets]);
    } else {
      await tx.query(`
        DELETE FROM shown_in
        WHERE showtime_id IN (
          SELECT id FROM showtimes WHERE showtime_date >= ?
        )
      `, [startDateStr]);

      await tx.query(`
        DELETE FROM showtimes
        WHERE showtime_date >= ?
      `, [startDateStr]);
    }

    console.log("Cleared existing showtimes without tickets from " + startDateStr);

    let insertedShowtimesCount = 0;

    // 4. Lập lịch cho từng ngày, từng phòng chiếu
    for (const dateStr of dates) {
      const currentDay = new Date(dateStr);

      // Lọc các phim có thể chiếu trong ngày này (release_date <= currentDay và end_date >= currentDay)
      const availableMovies = movies.filter(m => {
        const release = new Date(m.release_date);
        const end = m.end_date ? new Date(m.end_date) : null;
        return release <= currentDay && (!end || end >= currentDay);
      });

      if (availableMovies.length === 0) {
        console.log(`No available movies for date ${dateStr}. Skipping.`);
        continue;
      }

      for (const hall of halls) {
        const openingStr = hall.opening_time || "08:00:00";
        const closingStr = hall.closing_time || "23:59:00";

        // Mốc thời gian bắt đầu xếp lịch (8:30 sáng hoặc giờ mở cửa nếu muộn hơn)
        const [opHour, opMin] = openingStr.split(":").map(Number);
        let currentHour = Math.max(opHour, 8);
        let currentMin = opMin;
        if (currentHour === 8 && currentMin < 30) {
          currentMin = 30; // Bắt đầu lúc 08:30 nếu rạp mở trước đó
        }

        const [clHour, clMin] = closingStr.split(":").map(Number);
        const closingLimitMinutes = clHour * 60 + clMin;

        let safetyCounter = 0;

        while (safetyCounter < 20) {
          safetyCounter++;
          const currentTotalMinutes = currentHour * 60 + currentMin;

          // Chọn ngẫu nhiên 1 phim trong danh sách phim khả dụng
          const movie = availableMovies[Math.floor(Math.random() * availableMovies.length)];
          const duration = parseDurationMinutes(movie.duration);
          const cleaningBuffer = Number(hall.cleaning_buffer_minutes || 15);

          // Nếu suất chiếu kết thúc (bao gồm cả thời gian dọn dẹp) vượt quá giờ đóng cửa, kết thúc xếp lịch phòng này trong ngày
          if (currentTotalMinutes + duration + cleaningBuffer > closingLimitMinutes) {
            break;
          }

          // Quyết định định dạng suất chiếu (2D/3D) dựa trên hall.projection_capability
          let showType = "2D";
          if (hall.projection_capability === "3D") {
            showType = "3D";
          } else if (hall.projection_capability === "BOTH") {
            // Ngẫu nhiên chọn 2D hoặc 3D (80% là 2D, 20% là 3D)
            showType = Math.random() < 0.2 ? "3D" : "2D";
          }

          // Lấy giá vé tương ứng
          const price = TICKET_PRICE_BY_ROOM[hall.screen_type]?.[showType] || 120000;

          const startTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;

          // Chèn vào bảng showtimes
          const showtimeResult = await tx.query(`
            INSERT INTO showtimes (movie_start_time, show_type, screen_type, showtime_date, price_per_seat, status)
            VALUES (?, ?, ?, ?, ?, 'active')
          `, [startTimeStr, showType, hall.screen_type, dateStr, price]);

          const showtimeId = showtimeResult.insertId;

          // Chèn vào bảng shown_in
          await tx.query(`
            INSERT INTO shown_in (movie_id, showtime_id, hall_id, status)
            VALUES (?, ?, ?, 'active')
          `, [movie.id, showtimeId, hall.id]);

          insertedShowtimesCount++;

          // Cập nhật mốc thời gian tiếp theo: giờ hiện tại + thời lượng phim + thời gian dọn phòng
          const nextTotalMinutes = currentTotalMinutes + duration + cleaningBuffer;
          currentHour = Math.floor(nextTotalMinutes / 60);
          currentMin = nextTotalMinutes % 60;

          // Làm tròn mốc tiếp theo đến 5 hoặc 10 phút cho đẹp mắt
          currentMin = Math.ceil(currentMin / 5) * 5;
          if (currentMin >= 60) {
            currentHour += Math.floor(currentMin / 60);
            currentMin = currentMin % 60;
          }
        }
      }
    }

    await tx.commit();
    console.log(`Successfully seeded ${insertedShowtimesCount} showtimes.`);
  } catch (error) {
    console.error("Error during seeding showtimes:", error);
    await tx.rollback();
  } finally {
    tx.release();
    process.exit(0);
  }
}

main();
