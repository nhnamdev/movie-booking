require("dotenv").config();

const mysql = require("mysql2/promise");
const { uploadToR2 } = require("../services/storageService");

const AGE_RATINGS = {
  P: "P: Phim dành cho khán giả mọi lứa tuổi",
  T13: "T13: Phim dành cho khán giả từ đủ 13 tuổi trở lên (13+)",
  T16: "T16: Phim dành cho khán giả từ đủ 16 tuổi trở lên (16+)",
  T18: "T18: Phim dành cho khán giả từ đủ 18 tuổi trở lên (18+)",
  UNKNOWN: "Chưa công bố phân loại độ tuổi",
};

const movies = [
  {
    name: "Người Nhện 4: Khởi Đầu Mới",
    posterUrl: "https://www.sonypictures.com/sites/default/files/title-key-art/spidermanbrandnewday_onesheet_1400x2100_tt.jpg",
    sourcePage: "https://www.marvel.com/movies/spider-man-brand-new-day",
    trailerUrl: "https://www.youtube.com/watch?v=BwntXFBNfOA",
    language: "Tiếng Anh",
    synopsis: "Bốn năm sau khi cả thế giới quên Peter Parker, anh sống một mình và dành trọn thời gian bảo vệ New York. Một chuỗi tội phạm mới cùng sự biến đổi bất thường của năng lực buộc Người Nhện bước vào cuộc chiến mới.",
    duration: 145,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T13,
    cast: ["Tom Holland", "Zendaya", "Sadie Sink", "Jacob Batalon", "Jon Bernthal"],
    releaseDate: "2026-07-31",
    endDate: "2026-08-30",
    genres: ["Hành động", "Phiêu lưu", "Siêu anh hùng"],
    directors: ["Destin Daniel Cretton"],
  },
  {
    name: "Ma Xưởng Hòm",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/tall/6a716f1c2c1a5521622743.webp",
    sourcePage: "https://moveek.com/phim/ma-xuong-hom/",
    language: "Tiếng Indonesia",
    synopsis: "Một xưởng đóng quan tài trở thành tâm điểm của những hiện tượng kinh hoàng, kéo các nhân vật vào bí mật đen tối gắn với người chết và những nghi lễ chưa thể khép lại.",
    duration: 97,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T16,
    cast: ["Prilly Latuconsina", "Zee Asadel", "Dito Darmawan"],
    releaseDate: "2026-08-07",
    endDate: "2026-09-06",
    genres: ["Kinh dị"],
    directors: ["Awi Suryadi"],
  },
  {
    name: "Umamusume: Pretty Derby – Khởi Đầu Kỷ Nguyên Mới",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/6a546a19bcbb5825391386.webp",
    sourcePage: "https://moveek.com/phim/umamusume-pretty-derby-khoi-dau-ky-nguyen-moi/",
    language: "Tiếng Nhật",
    synopsis: "Jungle Pocket bước vào thế giới đua ngựa khốc liệt và theo đuổi ngôi vị cao nhất, nơi cô phải cạnh tranh với những đối thủ tài năng của một thế hệ mới.",
    duration: 108,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.P,
    cast: ["Yuri Fujimoto", "Sumire Uesaka", "Yui Ogura", "Haruna Fukushima", "Sora Tokui"],
    releaseDate: "2026-08-07",
    endDate: "2026-09-06",
    genres: ["Hoạt hình", "Thể thao"],
    directors: ["Ken Yamamoto"],
  },
  {
    name: "Thư Tình Gửi Ngoại",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/6a55e6565384c230557177.webp",
    sourcePage: "https://moveek.com/phim/thu-tinh-gui-ngoai/",
    language: "Tiếng Trung",
    synopsis: "Một lá thư tình đưa người trẻ trở về với ký ức gia đình, giúp họ hiểu hơn tình yêu, sự hy sinh và những điều người bà chưa từng nói thành lời.",
    duration: 117,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T13,
    cast: ["Li Sitong", "Wang Yantong", "Wu Shaoqing", "Zheng Runqi", "Wang Xiaohui"],
    releaseDate: "2026-08-07",
    endDate: "2026-09-06",
    genres: ["Tình cảm", "Gia đình"],
    directors: ["Lan Hongchun"],
  },
  {
    name: "Cô Nàng Ngổ Ngáo",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/32be3a9d9ebe77e7bab1f4580dbceb7303dba248.webp",
    sourcePage: "https://moveek.com/phim/my-sassy-girl-2001/",
    language: "Tiếng Hàn",
    synopsis: "Cuộc gặp tình cờ trên tàu điện đưa chàng sinh viên hiền lành Gyeon-woo đến với một cô gái khó đoán, mở ra chuyện tình vừa hài hước vừa nhiều cảm xúc.",
    duration: 124,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T13,
    cast: ["Cha Tae-hyun", "Jun Ji-hyun", "Kim In-mun", "Song Ok-suk", "Han Jin-hee"],
    releaseDate: "2026-08-07",
    endDate: "2026-09-06",
    genres: ["Hài", "Tình cảm"],
    directors: ["Kwak Jae-yong"],
  },
  {
    name: "Ám: Chuỗi Phim Ngắn Linh Dị",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/tall/6a6708c6b1124882417632.webp",
    sourcePage: "https://moveek.com/phim/am-chuoi-phim-ngan-linh-di/",
    language: "Tiếng Việt",
    synopsis: "Tuyển tập những câu chuyện linh dị Việt Nam khai thác nỗi sợ từ đời sống quen thuộc, nơi mỗi nhân vật phải đối diện với hậu quả của những bí mật bị che giấu.",
    duration: 100,
    audioType: "Tiếng Việt",
    ageRating: AGE_RATINGS.T18,
    cast: ["Mai Cát Vi", "Lê Công Hoàng"],
    releaseDate: "2026-08-07",
    endDate: "2026-09-06",
    genres: ["Kinh dị"],
    directors: ["Phan Bá Hỷ", "Đỗ Quốc Trung", "Châu Trần", "Nguyễn Hữu Quốc Tuấn"],
  },
  {
    name: "Ngày Tàn Của Phố Oak",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/69d5d3c555b78666299384.webp",
    sourcePage: "https://moveek.com/phim/ngay-tan-cua-pho-oak/",
    language: "Tiếng Anh",
    synopsis: "Một biến cố bí ẩn phá vỡ cuộc sống yên bình tại phố Oak. Những cư dân nơi đây phải tìm cách sinh tồn khi các mối quan hệ và bí mật trong cộng đồng lần lượt bị phơi bày.",
    duration: 100,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T13,
    cast: ["Anne Hathaway", "Ewan McGregor", "Christian Convery", "Maisy Stella", "Jordan Alexa Davis"],
    releaseDate: "2026-08-14",
    endDate: "2026-09-13",
    genres: ["Kinh dị", "Bí ẩn"],
    directors: ["David Robert Mitchell"],
  },
  {
    name: "Sợi Chỉ Đỏ",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/69eee228a0c93303815038.webp",
    sourcePage: "https://www.cgv.vn/default/soi-chi-do.html",
    language: "Tiếng Việt",
    synopsis: "Những con người tưởng như xa lạ bị kết nối bởi một sợi chỉ định mệnh, từ đó lần theo chuỗi bí ẩn và đối diện với những thế lực đáng sợ vượt ngoài hiểu biết thông thường.",
    duration: null,
    audioType: "Tiếng Việt",
    ageRating: AGE_RATINGS.UNKNOWN,
    cast: ["Đoàn Minh Anh", "Quang Tuấn", "Trần Nghĩa", "Ngọc Phước", "Ba Tây"],
    releaseDate: "2026-08-14",
    endDate: "2026-09-13",
    genres: ["Kinh dị"],
    directors: ["Hàm Trần"],
  },
  {
    name: "PAW Patrol: Phim Khủng Long",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/69f9578cb6c8a150431467.webp",
    sourcePage: "https://www.cgv.vn/default/paw-patrol-dino.html",
    language: "Tiếng Anh",
    synopsis: "Đội chó cứu hộ PAW Patrol bước vào chuyến phiêu lưu thời tiền sử, hợp sức bảo vệ những người bạn khủng long trước một mối nguy mới.",
    duration: 89,
    audioType: "Lồng tiếng/Phụ đề",
    ageRating: AGE_RATINGS.P,
    cast: ["Carter Young", "Hayden Chamberlen", "Mckenna Grace", "Rain Janjua", "Henry Bolan"],
    releaseDate: "2026-08-14",
    endDate: "2026-09-13",
    genres: ["Hoạt hình", "Hành động", "Phiêu lưu"],
    directors: ["Cal Brunker"],
  },
  {
    name: "Agito: Cuộc Chiến Siêu Năng Lực",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/6a4f12029fc36014256640.webp",
    sourcePage: "https://moveek.com/phim/agito-cuoc-chien-sieu-nang-luc/",
    language: "Tiếng Nhật",
    synopsis: "Những chiến binh mang sức mạnh Agito bị cuốn vào cuộc đối đầu với một dự án vũ khí bí mật, buộc họ lựa chọn cách sử dụng năng lực để bảo vệ con người.",
    duration: 97,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T16,
    cast: ["Jun Kaname", "Yuna Kogawa", "Toshiki Kashu", "Takanori Higuchi", "Hiroaki Iwanaga"],
    releaseDate: "2026-08-14",
    endDate: "2026-09-13",
    genres: ["Hành động", "Khoa học viễn tưởng"],
    directors: ["Ryuta Tasaki"],
  },
  {
    name: "Điểm Mù",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/6a7442639cf87089399902.webp",
    sourcePage: "https://moveek.com/phim/diem-mu/",
    language: "Tiếng Hàn",
    synopsis: "Sau cái chết bất thường của người chị em song sinh, Seo-jin truy tìm kẻ thủ ác trong khi căn bệnh di truyền khiến thị lực của cô suy giảm từng ngày.",
    duration: 106,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.T18,
    cast: ["Shin Min-a", "Kim Nam-hee", "Kim Young-ah", "Lee Seung-ryong"],
    releaseDate: "2026-08-14",
    endDate: "2026-09-13",
    genres: ["Giật gân", "Kinh dị"],
    directors: ["Yeom Ji-ho"],
  },
  {
    name: "Nghỉ Hè Sợ Nghỉ Hưu",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/6a5dacda12b0e813696250.webp",
    sourcePage: "https://www.cgv.vn/default/nghi-he-so-nghi-huu.html",
    language: "Tiếng Việt",
    synopsis: "Trí Bình trở về quê nghỉ hè cùng ông nội và liên tiếp chứng kiến những hiện tượng kỳ lạ. Hành trình tìm lời giải giúp cậu vượt qua khoảng cách thế hệ và hiểu lại giá trị gia đình.",
    duration: 120,
    audioType: "Tiếng Việt",
    ageRating: AGE_RATINGS.T13,
    cast: ["Huỳnh Lập", "NSƯT Cao Minh", "Cody Nam Võ", "Tín Nguyễn"],
    releaseDate: "2026-08-21",
    endDate: "2026-09-20",
    genres: ["Hài", "Gia đình", "Tâm linh"],
    directors: ["Huỳnh Lập"],
  },
  {
    name: "Insidious: Quỷ Quyệt Ranh Giới Vô Định",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/69ddb1c604bef651486876.webp",
    sourcePage: "https://moveek.com/phim/insidious-out-of-the-further/",
    language: "Tiếng Anh",
    synopsis: "Cánh cửa đến The Further một lần nữa mở ra, kéo những con người mới vào vùng ranh giới vô định và buộc họ đối diện với các thực thể quỷ dữ đang tìm đường trở lại.",
    duration: null,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.UNKNOWN,
    cast: ["Amelia Eve", "Lin Shaye", "Brandon Perea", "Maisie Richardson-Sellers", "Sam Spruell"],
    releaseDate: "2026-08-21",
    endDate: "2026-09-20",
    genres: ["Kinh dị", "Siêu nhiên"],
    directors: ["Jacob Chase"],
  },
  {
    name: "Shin Cậu Bé Bút Chì: Kỳ Kỳ Quái Quái! Kỳ Nghỉ Yêu Quái Của Tớ",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/6a322ae008124992810945.webp",
    sourcePage: "https://moveek.com/phim/shin-cau-be-but-chi-ky-ky-quai-quai-ky-nghi-yeu-quai-cua-to/",
    language: "Tiếng Nhật",
    synopsis: "Kỳ nghỉ của Shin và gia đình bất ngờ biến thành chuyến phiêu lưu kỳ quái khi những yêu quái xuất hiện, kéo nhóm bạn Kasukabe vào hàng loạt tình huống dở khóc dở cười.",
    duration: 105,
    audioType: "Lồng tiếng",
    ageRating: AGE_RATINGS.P,
    cast: ["Yumiko Kobayashi", "Miki Narahashi", "Toshiyuki Morikawa", "Satomi Kourogi"],
    releaseDate: "2026-08-21",
    endDate: "2026-09-20",
    genres: ["Hoạt hình", "Hài", "Phiêu lưu"],
    directors: ["Masaki Watanabe"],
  },
  {
    name: "Quỷ Móc Mắt",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/6a716ea55a3d2824462810.webp",
    sourcePage: "https://moveek.com/phim/quy-moc-mat/",
    language: "Tiếng Thái",
    synopsis: "Sau khi người vợ trở về từ rừng Budo với biểu hiện kỳ lạ rồi qua đời, Anas tin linh hồn cô bị giam trong thế giới Djinn và quyết quay lại khu rừng để giải cứu.",
    duration: 97,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.UNKNOWN,
    cast: ["Yotsawat Tawapee", "Rattanawadee Wongtong", "Sutida Buatig", "Sonthaya Chitmanee", "Peeyarat Jatupo"],
    releaseDate: "2026-08-21",
    endDate: "2026-09-20",
    genres: ["Giật gân", "Kinh dị"],
    directors: ["Kriangkrai Monvichit"],
  },
  {
    name: "Hộ Linh Tráng Sĩ: Bí Ẩn Mộ Vua Đinh",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/tall/6a70a700e2d22435196175.webp",
    sourcePage: "https://moveek.com/phim/ho-linh-trang-si-bi-an-mo-vua-dinh/",
    language: "Tiếng Việt",
    synopsis: "Bảy tráng sĩ nhận nhiệm vụ bảo vệ đoàn 99 quan tài của Vua Đinh, bước vào hành trình hiểm nguy đan xen giữa lịch sử, huyền tích và những trận chiến sinh tử.",
    duration: null,
    audioType: "Tiếng Việt",
    ageRating: AGE_RATINGS.UNKNOWN,
    cast: ["Quách Ngọc Ngoan", "Tuấn Trần", "Thiên Tú", "Johnny Trí Nguyễn", "NSND Tự Long"],
    releaseDate: "2026-08-28",
    endDate: "2026-09-27",
    genres: ["Hành động", "Lịch sử", "Huyền sử"],
    directors: ["Nguyễn Phan Quang Bình"],
  },
  {
    name: "Chòm Sao Bất Diệt",
    posterUrl: "https://cdn.moveek.com/storage/media/cache/large/6a69a8dd0e79c924626036.webp",
    sourcePage: "https://moveek.com/phim/the-dog-stars/",
    language: "Tiếng Anh",
    synopsis: "Trong thế giới hậu tận thế, một người đàn ông cùng chú chó trung thành rời nơi trú ẩn để tìm kiếm dấu hiệu của sự sống và hy vọng còn sót lại.",
    duration: 100,
    audioType: "Phụ đề",
    ageRating: AGE_RATINGS.UNKNOWN,
    cast: ["Jacob Elordi", "Josh Brolin", "Margaret Qualley", "Guy Pearce", "Allison Janney"],
    releaseDate: "2026-08-28",
    endDate: "2026-09-27",
    genres: ["Phiêu lưu", "Khoa học viễn tưởng"],
    directors: ["Ridley Scott"],
  },
];

const slugify = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getPosterExtension = (mimeType) => {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
};

const downloadAndUploadPoster = async (movie) => {
  const response = await fetch(movie.posterUrl, {
    headers: { "User-Agent": "Mozilla/5.0 CGV movie seed/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Không tải được poster ${movie.name}: HTTP ${response.status}`);
  }

  const mimeType = String(response.headers.get("content-type") || "")
    .split(";")[0]
    .toLowerCase();
  if (!mimeType.startsWith("image/")) {
    throw new Error(`Poster ${movie.name} không phải định dạng ảnh (${mimeType || "không rõ"})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const fileName = `august-2026-${slugify(movie.name)}.${getPosterExtension(mimeType)}`;
  const uploaded = await uploadToR2({ buffer, fileName, mimeType, folder: "movies" });
  return uploaded.url;
};

const replaceRelations = async (connection, movieId, movie) => {
  await connection.query("DELETE FROM movie_genre WHERE movie_id = ?", [movieId]);
  await connection.query("DELETE FROM movie_directors WHERE movie_id = ?", [movieId]);

  for (const genre of movie.genres) {
    await connection.query("INSERT INTO movie_genre (movie_id, genre) VALUES (?, ?)", [movieId, genre]);
  }
  for (const director of movie.directors) {
    await connection.query("INSERT INTO movie_directors (movie_id, director) VALUES (?, ?)", [movieId, director]);
  }
};

const upsertMovie = async (connection, movie, imagePath) => {
  const [existingRows] = await connection.query(
    "SELECT id FROM movie WHERE name = ? ORDER BY id LIMIT 1",
    [movie.name]
  );
  const values = [
    imagePath,
    movie.trailerUrl || null,
    movie.language,
    movie.synopsis,
    null,
    movie.duration,
    movie.audioType,
    movie.ageRating,
    movie.cast.join(", "),
    movie.releaseDate,
    movie.endDate,
  ];

  if (existingRows.length > 0) {
    const movieId = existingRows[0].id;
    await connection.query(
      `UPDATE movie
       SET image_path = ?, trailer_url = ?, language = ?, synopsis = ?, rating = ?,
           duration = ?, audio_type = ?, age_rating = ?, top_cast = ?, release_date = ?, end_date = ?
       WHERE id = ?`,
      [...values, movieId]
    );
    await replaceRelations(connection, movieId, movie);
    return { movieId, action: "updated" };
  }

  const [result] = await connection.query(
    `INSERT INTO movie
      (name, image_path, trailer_url, language, synopsis, rating, duration,
       audio_type, age_rating, top_cast, release_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [movie.name, ...values]
  );
  await replaceRelations(connection, result.insertId, movie);
  return { movieId: result.insertId, action: "inserted" };
};

const run = async () => {
  const requiredEnvironment = [
    "DB_HOST",
    "DB_USER",
    "DB_NAME",
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
  ];
  const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);
  if (missingEnvironment.length > 0) {
    throw new Error(`Thiếu biến môi trường: ${missingEnvironment.join(", ")}`);
  }

  console.log(`Đang tải ${movies.length} poster và đồng bộ lên R2...`);
  const preparedMovies = [];
  for (const movie of movies) {
    const imagePath = await downloadAndUploadPoster(movie);
    preparedMovies.push({ movie, imagePath });
    console.log(`- Đã tải poster: ${movie.name}`);
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

  let inserted = 0;
  let updated = 0;
  try {
    await connection.query("SET time_zone = ?", [process.env.DB_SESSION_TIMEZONE || "+07:00"]);
    await connection.beginTransaction();
    for (const item of preparedMovies) {
      const result = await upsertMovie(connection, item.movie, item.imagePath);
      if (result.action === "inserted") inserted += 1;
      else updated += 1;
      console.log(`- ${result.action === "inserted" ? "Thêm" : "Cập nhật"}: ${item.movie.name} (ID ${result.movieId})`);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }

  console.log(`Hoàn tất seed phim tháng 08/2026: thêm ${inserted}, cập nhật ${updated}.`);
};

run().catch((error) => {
  console.error("Seed phim tháng 08/2026 thất bại:", error);
  process.exit(1);
});
