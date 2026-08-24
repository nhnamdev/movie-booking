require("dotenv").config({ path: __dirname + "/../.env" });
const mysql = require("mysql2/promise");

const START_DATE = "2026-08-24";
const END_DATE = "2026-09-10";

const AGE_RATINGS = {
  P: "P: Phim dành cho khán giả mọi lứa tuổi",
  T13: "T13: Phim dành cho khán giả từ đủ 13 tuổi trở lên (13+)",
  T16: "T16: Phim dành cho khán giả từ đủ 16 tuổi trở lên (16+)",
  T18: "T18: Phim dành cho khán giả từ đủ 18 tuổi trở lên (18+)",
  UNKNOWN: "Chưa công bố phân loại độ tuổi",
};

const TICKET_PRICES = {
  "Tiêu chuẩn": {
    "2D": 120000,
    "3D": 150000,
  },
  "Cao cấp": {
    "2D": 150000,
    "3D": 180000,
  },
};

const cgvMovies = [
  {
    name: "Người Nhện 4: Khởi Đầu Mới",
    posterUrl: "https://www.sonypictures.com/sites/default/files/title-key-art/spidermanbrandnewday_onesheet_1400x2100_tt.jpg",
    trailerUrl: "https://www.youtube.com/watch?v=BwntXFBNfOA",
    language: "Tiếng Anh",
    synopsis: "Bốn năm sau khi cả thế giới quên Peter Parker, anh sống một mình và dành trọn thời gian bảo vệ New York. Một chuỗi tội phạm mới cùng sự biến đổi bất thường của năng lực buộc Người Nhện bước vào cuộc chiến mới.",
    duration: 145,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T13,
    cast: ["Tom Holland", "Zendaya", "Sadie Sink", "Jacob Batalon", "Jon Bernthal"],
    releaseDate: "2026-07-31",
    endDate: "2026-09-15",
    genres: ["Hành động", "Phiêu lưu", "Siêu anh hùng"],
    directors: ["Destin Daniel Cretton"],
  },
  {
    name: "Ma Xưởng Hòm",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/tall/6a716f1c2c1a5521622743.webp",
    trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    language: "Tiếng Indonesia",
    synopsis: "Một xưởng đóng quan tài trở thành tâm điểm của những hiện tượng kinh hoàng, kéo các nhân vật vào bí mật đen tối gắn với người chết và những nghi lễ chưa thể khép lại.",
    duration: 97,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T16,
    cast: ["Prilly Latuconsina", "Zee Asadel", "Dito Darmawan"],
    releaseDate: "2026-08-07",
    endDate: "2026-09-15",
    genres: ["Kinh dị"],
    directors: ["Awi Suryadi"],
  },
  {
    name: "Shin Cậu Bé Bút Chì: Kỳ Kỳ Quái Quái! Kỳ Nghỉ Yêu Quái Của Tớ",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/6a322ae008124992810945.webp",
    trailerUrl: "https://www.youtube.com/watch?v=kXYiU_JCYtU",
    language: "Tiếng Nhật",
    synopsis: "Kỳ nghỉ hè của gia đình Nohara và nhóm bạn Kasukabe bỗng trở nên rộn ràng khi họ lạc vào ngôi làng của những yêu quái tinh nghịch, mở ra hành trình bảo vệ tình bạn đầy tiếng cười và cảm động.",
    duration: 105,
    audioType: "Lồng tiếng / Phụ đề",
    ageRating: AGE_RATINGS.P,
    cast: ["Yumiko Kobayashi", "Miki Narahashi", "Toshiyuki Morikawa", "Satomi Kourogi"],
    releaseDate: "2026-08-21",
    endDate: "2026-09-25",
    genres: ["Hoạt hình", "Hài", "Phiêu lưu"],
    directors: ["Masaki Watanabe"],
  },
  {
    name: "Quỷ Móc Mắt",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/6a716ea55a3d2824462810.webp",
    trailerUrl: "https://www.youtube.com/watch?v=YQHsXMglC9A",
    language: "Tiếng Thái",
    synopsis: "Sau khi người vợ trở về từ rừng Budo với biểu hiện kỳ lạ rồi qua đời, Anas tin linh hồn cô bị giam trong thế giới Djinn và quyết quay lại khu rừng để giải cứu trước khi bóng tối nuốt chửng linh hồn.",
    duration: 98,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T18,
    cast: ["Yotsawat Tawapee", "Rattanawadee Wongtong", "Sutida Buatig", "Sonthaya Chitmanee"],
    releaseDate: "2026-08-21",
    endDate: "2026-09-20",
    genres: ["Kinh dị", "Giật gân"],
    directors: ["Kriangkrai Monvichit"],
  },
  {
    name: "Còi Báo Tử (Whistle)",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/69eee228a0c93303815038.webp",
    trailerUrl: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    language: "Tiếng Anh",
    synopsis: "Một nhóm học sinh tìm thấy chiếc còi cổ bí ẩn bị chôn vùi. Khi chiếc còi được thổi lên, nó đánh thức một thực thể săn mồi cổ xưa không bao giờ dừng lại cho đến khi kẻ thổi còi phải đền mạng.",
    duration: 104,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T16,
    cast: ["Dafne Keen", "Sophie Nélisse", "Sky Yang", "Percy Hynes White", "Nick Frost"],
    releaseDate: "2026-08-21",
    endDate: "2026-09-20",
    genres: ["Kinh dị", "Bí ẩn"],
    directors: ["Corin Hardy"],
  },
  {
    name: "Nghỉ Hè Sợ Nghỉ Hưu",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/6a5dacda12b0e813696250.webp",
    trailerUrl: "https://www.youtube.com/watch?v=9bZkp7q19f0",
    language: "Tiếng Việt",
    synopsis: "Trí Bình trở về quê nghỉ hè cùng ông nội và liên tiếp chứng kiến những hiện tượng tâm linh kỳ lạ. Hành trình tìm lời giải giúp cậu vượt qua khoảng cách thế hệ và hiểu lại giá trị thiêng liêng của gia đình.",
    duration: 118,
    audioType: "Tiếng Việt",
    ageRating: AGE_RATINGS.T13,
    cast: ["Huỳnh Lập", "NSƯT Cao Minh", "Cody Nam Võ", "Tín Nguyễn"],
    releaseDate: "2026-08-21",
    endDate: "2026-09-25",
    genres: ["Hài", "Gia đình", "Tâm linh"],
    directors: ["Huỳnh Lập"],
  },
  {
    name: "Thư Tình Gửi Ngoại",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/6a55e6565384c230557177.webp",
    trailerUrl: "https://www.youtube.com/watch?v=L_LUpnjgPso",
    language: "Tiếng Trung",
    synopsis: "Một lá thư tình đưa người trẻ trở về với ký ức gia đình ấm áp, giúp họ thấu hiểu tình yêu, sự hy sinh thầm lặng và những điều người bà chưa từng nói thành lời.",
    duration: 117,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T13,
    cast: ["Li Sitong", "Wang Yantong", "Wu Shaoqing", "Zheng Runqi", "Wang Xiaohui"],
    releaseDate: "2026-08-07",
    endDate: "2026-09-15",
    genres: ["Tâm lý", "Gia đình", "Tình cảm"],
    directors: ["Lan Hongchun"],
  },
  {
    name: "Hộ Linh Tráng Sĩ: Bí Ẩn Mộ Vua Đinh",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/tall/6a70a700e2d22435196175.webp",
    trailerUrl: "https://www.youtube.com/watch?v=fJ9rUzIMcZQ",
    language: "Tiếng Việt",
    synopsis: "Bảy tráng sĩ nhận sứ mệnh bảo vệ đoàn 99 quan tài của Vua Đinh Tiên Hoàng, bước vào hành trình đầy cạm bẫy hiểm nguy đan xen giữa lịch sử hào hùng, huyền tích dân gian và những trận quyết chiến sinh tử.",
    duration: 125,
    audioType: "Tiếng Việt",
    ageRating: AGE_RATINGS.T16,
    cast: ["Quách Ngọc Ngoan", "Tuấn Trần", "Thiên Tú", "Johnny Trí Nguyễn", "NSND Tự Long"],
    releaseDate: "2026-08-28",
    endDate: "2026-10-05",
    genres: ["Hành động", "Lịch sử", "Huyền sử"],
    directors: ["Nguyễn Phan Quang Bình"],
  },
  {
    name: "Chiikawa: Bí Mật Đảo Người Cá",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/6a546a19bcbb5825391386.webp",
    trailerUrl: "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
    language: "Tiếng Nhật",
    synopsis: "Bộ ba đáng yêu Chiikawa, Hachiware và Usagi nhận lời mời du lịch đến hòn đảo bí mật nơi người cá sinh sống, vô tình khám phá ra câu chuyện kỳ bí đằng sau làn nước biển trong xanh.",
    duration: 88,
    audioType: "Lồng tiếng / Phụ đề",
    ageRating: AGE_RATINGS.P,
    cast: ["Makoto Aoki", "Masato Tanaka", "Ari Ozawa"],
    releaseDate: "2026-08-28",
    endDate: "2026-09-30",
    genres: ["Hoạt hình", "Phiêu lưu", "Gia đình"],
    directors: ["Takenori Mihara"],
  },
  {
    name: "Mutiny (Nổi Loạn)",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/69d5d3c555b78666299384.webp",
    trailerUrl: "https://www.youtube.com/watch?v=2Vv-BfVoq4g",
    language: "Tiếng Anh",
    synopsis: "Sau khi ông chủ tỷ phú bị ám sát ngay trước mắt, cựu đặc nhiệm Cole Reed bị gài bẫy trở thành thủ phạm và phải trốn chạy khỏi sự truy lùng gắt gao của cả cảnh sát lẫn một tổ chức lính đánh thuê khét tiếng.",
    duration: 112,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T18,
    cast: ["Jason Statham", "Annabelle Wallis", "Jason Wong", "Roland Møller"],
    releaseDate: "2026-08-28",
    endDate: "2026-09-30",
    genres: ["Hành động", "Tội phạm", "Giật gân"],
    directors: ["Jean-François Richet"],
  },
  {
    name: "Hope: Vùng Tử Địa",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/6a7442639cf87089399902.webp",
    trailerUrl: "https://www.youtube.com/watch?v=CevxZvSJLk8",
    language: "Tiếng Hàn / Tiếng Anh",
    synopsis: "Một thị trấn hẻo lánh bỗng bị cô lập khi một sinh vật ngoài hành tinh rơi xuống. Người dân địa phương và các chuyên gia phải hợp lực chiến đấu trong tuyệt vọng để giữ lấy hy vọng sống còn cuối cùng.",
    duration: 130,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T18,
    cast: ["Hwang Jung-min", "Zo In-sung", "Jung Ho-yeon", "Michael Fassbender", "Alicia Vikander"],
    releaseDate: "2026-09-04",
    endDate: "2026-10-10",
    genres: ["Khoa học viễn tưởng", "Hành động", "Giật gân"],
    directors: ["Na Hong-jin"],
  },
  {
    name: "Ma Tù",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/69ddb1c604bef651486876.webp",
    trailerUrl: "https://www.youtube.com/watch?v=JGwWNGJdvx8",
    language: "Tiếng Thái",
    synopsis: "Một trại giam biệt lập thời xưa bị đồn là nơi giam giữ những linh hồn quỷ quyệt không thể siêu thoát. Khi một nhóm tù nhân mưu toan vượt ngục, họ vô tình mở ra cánh cửa dẫn đến cơn ác mộng rùng rợn nhưng không kém phần hài hước.",
    duration: 102,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T16,
    cast: ["Mario Maurer", "Pongsatorn Jongwilas", "Nattapong Chartpong", "Attharut Kongrasri"],
    releaseDate: "2026-09-04",
    endDate: "2026-10-10",
    genres: ["Hài", "Kinh dị"],
    directors: ["Banjong Pisanthanakun"],
  },
  {
    name: "Một Đêm Duy Nhất (One Night Only)",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/32be3a9d9ebe77e7bab1f4580dbceb7303dba248.webp",
    trailerUrl: "https://www.youtube.com/watch?v=uelHwf8o7_U",
    language: "Tiếng Anh",
    synopsis: "Hai người xa lạ tình cờ gặp nhau tại thành phố hoa lệ trong một đêm giao thừa. Họ cùng nhau trải qua 24 giờ ngập tràn tiếng cười, âm nhạc và những rung cảm sâu sắc trước khi mỗi người phải quay về thế giới riêng.",
    duration: 108,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T13,
    cast: ["Paul Mescal", "Daisy Edgar-Jones", "Fionn O'Shea"],
    releaseDate: "2026-09-04",
    endDate: "2026-10-10",
    genres: ["Lãng mạn", "Hài", "Tâm lý"],
    directors: ["Richard Linklater"],
  },
];

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

const formatTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

const parseDuration = (dur) => {
  if (!dur) return 105;
  const num = parseInt(dur, 10);
  return isNaN(num) || num <= 0 ? 105 : num;
};

const seedCgvData = async (connection) => {
  console.log("=== BẮT ĐẦU SEED DỮ LIỆU PHIM CGV ===");

  // 1. Đồng bộ và cập nhật danh sách phim
  const seededMovieIds = [];
  for (const movie of cgvMovies) {
    const [existing] = await connection.query(
      "SELECT id FROM movie WHERE name = ? LIMIT 1",
      [movie.name]
    );

    let movieId;
    if (existing.length > 0) {
      movieId = existing[0].id;
      await connection.query(
        `UPDATE movie
         SET image_path = ?, trailer_url = ?, language = ?, synopsis = ?,
             duration = ?, audio_type = ?, age_rating = ?, top_cast = ?,
             release_date = ?, end_date = ?
         WHERE id = ?`,
        [
          movie.posterUrl,
          movie.trailerUrl,
          movie.language,
          movie.synopsis,
          movie.duration,
          movie.audioType,
          movie.ageRating,
          movie.cast.join(", "),
          movie.releaseDate,
          movie.endDate,
          movieId,
        ]
      );
      console.log(`- Cập nhật phim: ${movie.name} (ID: ${movieId})`);
    } else {
      const [insertRes] = await connection.query(
        `INSERT INTO movie
          (name, image_path, trailer_url, language, synopsis, rating, duration,
           audio_type, age_rating, top_cast, release_date, end_date)
         VALUES (?, ?, ?, ?, ?, 8.5, ?, ?, ?, ?, ?, ?)`,
        [
          movie.name,
          movie.posterUrl,
          movie.trailerUrl,
          movie.language,
          movie.synopsis,
          movie.duration,
          movie.audioType,
          movie.ageRating,
          movie.cast.join(", "),
          movie.releaseDate,
          movie.endDate,
        ]
      );
      movieId = insertRes.insertId;
      console.log(`- Thêm mới phim: ${movie.name} (ID: ${movieId})`);
    }

    seededMovieIds.push(movieId);

    // Thể loại & Đạo diễn
    await connection.query("DELETE FROM movie_genre WHERE movie_id = ?", [movieId]);
    await connection.query("DELETE FROM movie_directors WHERE movie_id = ?", [movieId]);

    for (const genre of movie.genres) {
      await connection.query(
        "INSERT IGNORE INTO movie_genre (movie_id, genre) VALUES (?, ?)",
        [movieId, genre]
      );
    }
    for (const director of movie.directors) {
      await connection.query(
        "INSERT IGNORE INTO movie_directors (movie_id, director) VALUES (?, ?)",
        [movieId, director]
      );
    }
  }

  console.log(`\n=== BẮT ĐẦU SEED SUẤT CHIẾU TỪ ${START_DATE} ĐẾN ${END_DATE} ===`);

  // 2. Lấy danh sách rạp và phòng chiếu hoạt động
  const [halls] = await connection.query(
    `SELECT h.id, h.name, h.theatre_id, h.screen_type, h.projection_capability, h.cleaning_buffer_minutes
     FROM hall h
     JOIN theatre t ON t.id = h.theatre_id
     WHERE h.status = 'active' AND t.status = 'active'`
  );

  if (halls.length === 0) {
    throw new Error("Không có phòng chiếu (hall) nào hoạt động trong database!");
  }

  // Lấy các showtimes đã có vé đặt để không xóa
  const [bookedShowtimes] = await connection.query(
    "SELECT DISTINCT showtimes_id FROM ticket WHERE ticket_status IN ('ISSUED', 'CHECKED_IN')"
  );
  const bookedIds = bookedShowtimes.map((row) => row.showtimes_id);

  // Dọn dẹp các suất chiếu chưa đặt trong khoảng START_DATE -> END_DATE
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

  const [delShownIn] = await connection.query(deleteShownInSql, deleteParams);
  const [delShowtimes] = await connection.query(deleteShowtimesSql, deleteParams);
  console.log(`- Đã xóa ${delShowtimes.affectedRows} suất chiếu cũ chưa có vé đặt.`);

  // Lấy danh sách phim đang có trong database
  const [allMovies] = await connection.query(
    "SELECT id, name, duration, release_date, end_date FROM movie"
  );

  const dates = getDatesInRange(START_DATE, END_DATE);
  let totalShowtimesCount = 0;

  for (const dateStr of dates) {
    const showDate = new Date(dateStr);

    // Phim đang chiếu tại ngày này (release_date <= showDate <= end_date)
    const playingMovies = allMovies.filter((m) => {
      const rel = new Date(m.release_date);
      const end = m.end_date ? new Date(m.end_date) : null;
      return rel <= showDate && (!end || end >= showDate);
    });

    if (playingMovies.length === 0) {
      console.log(`- Ngày ${dateStr}: Chưa có phim phát hành. Bỏ qua.`);
      continue;
    }

    for (const hall of halls) {
      let currentMinutes = 8 * 60 + 30; // 08:30 sáng
      const closeMinutes = 23 * 60 + 59; // 23:59 đêm
      const buffer = hall.cleaning_buffer_minutes || 15;

      // Xếp các suất chiếu liên tiếp trong ngày cho phòng chiếu
      while (currentMinutes < 22 * 60 + 30) {
        const movie = playingMovies[Math.floor(Math.random() * playingMovies.length)];
        const movieDuration = parseDuration(movie.duration);

        if (currentMinutes + movieDuration > closeMinutes) {
          break;
        }

        let showType = "2D";
        if (hall.projection_capability === "3D") {
          showType = "3D";
        } else if (hall.projection_capability === "BOTH") {
          showType = Math.random() > 0.8 ? "3D" : "2D";
        }

        const screenType = hall.screen_type || "Tiêu chuẩn";
        const price = TICKET_PRICES[screenType]?.[showType] || 120000;
        const startTimeStr = formatTime(currentMinutes);

        const [stRes] = await connection.query(
          `INSERT INTO showtimes (movie_start_time, show_type, screen_type, showtime_date, price_per_seat, status)
           VALUES (?, ?, ?, ?, ?, 'active')`,
          [startTimeStr, showType, screenType, dateStr, price]
        );

        const showtimeId = stRes.insertId;

        await connection.query(
          `INSERT INTO shown_in (movie_id, showtime_id, hall_id, status)
           VALUES (?, ?, ?, 'active')`,
          [movie.id, showtimeId, hall.id]
        );

        totalShowtimesCount++;
        currentMinutes += movieDuration + buffer;
      }
    }
    console.log(`- Đã tạo lịch chiếu ngày ${dateStr} cho ${halls.length} phòng chiếu.`);
  }

  // 3. Tự động đồng bộ và tính lại điểm đánh giá cho các phim
  await connection.query(
    `UPDATE movie M
     SET rating = COALESCE(
       (SELECT ROUND(AVG(R.rating), 1) FROM movie_review R WHERE R.movie_id = M.id),
       M.rating,
       8.5
     )`
  );

  console.log(`\n🎉 HOÀN TẤT SEED DỮ LIỆU CGV THÀNH CÔNG!`);
  console.log(`- Tổng số phim cập nhật: ${cgvMovies.length}`);
  console.log(`- Tổng số suất chiếu mới tạo đến 10/09/2026: ${totalShowtimesCount}`);
  return { moviesCount: cgvMovies.length, totalShowtimesCount };
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
    await seedCgvData(connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error("❌ Seed dữ liệu thất bại:", error);
    throw error;
  } finally {
    await connection.end();
  }
};

if (require.main === module) {
  run().then(() => {
    console.log("Xong!");
    process.exit(0);
  }).catch((err) => {
    console.error("Lỗi:", err);
    process.exit(1);
  });
}

module.exports = { seedCgvData, cgvMovies, START_DATE, END_DATE };
