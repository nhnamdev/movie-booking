const express = require("express");
const rateLimit = require("express-rate-limit");
const openai = require("./openaiClient");
const prompts = require("./prompts");
const helpers = require("./helpers");
const cache = require("./cache");

const router = express.Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.AI_RATE_LIMIT_PER_MIN) || 20,
  message: { error: "Quá nhiều yêu cầu, vui lòng thử lại sau." },
});

router.use(limiter);

// Middleware kiểm tra AI_ENABLED và OPENAI_API_KEY
router.use((req, res, next) => {
  if (process.env.AI_ENABLED !== "true") {
    return res.status(503).json({ error: "Tính năng AI chưa được kích hoạt." });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "Chưa cấu hình OpenAI API key." });
  }
  next();
});

// ─── CHATBOT ─────────────────────────────────────────────────────────────────

const CHATBOT_TOOLS = [
  {
    type: "function",
    function: {
      name: "getLatestMovies",
      description: "Lấy danh sách phim mới nhất đang chiếu tại CGV",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "getTheatres",
      description: "Lấy danh sách rạp CGV và địa chỉ",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "getShowtimesByMovie",
      description: "Lấy lịch chiếu của một bộ phim cụ thể",
      parameters: {
        type: "object",
        properties: {
          movieId: { type: "number", description: "ID của phim" },
        },
        required: ["movieId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getGenres",
      description: "Lấy danh sách thể loại phim",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

router.post("/chat", async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages không hợp lệ." });
  }

  const db = req.app.get("db");

  const conversation = [
    { role: "system", content: prompts.CHATBOT_SYSTEM },
    ...messages.slice(-10), // giữ tối đa 10 tin nhắn gần nhất
  ];

  try {
    let response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: conversation,
      tools: CHATBOT_TOOLS,
      tool_choice: "auto",
    });

    let msg = response.choices[0].message;

    // Xử lý function calling (tối đa 3 vòng để tránh loop)
    let iterations = 0;
    while (msg.tool_calls && iterations < 3) {
      iterations++;
      conversation.push(msg);

      const toolResults = await Promise.all(
        msg.tool_calls.map(async (tc) => {
          const args = JSON.parse(tc.function.arguments || "{}");
          let result;
          try {
            if (tc.function.name === "getLatestMovies") result = await helpers.getLatestMovies(db);
            else if (tc.function.name === "getTheatres") result = await helpers.getTheatres(db);
            else if (tc.function.name === "getShowtimesByMovie") result = await helpers.getShowtimesByMovie(db, args.movieId);
            else if (tc.function.name === "getGenres") result = await helpers.getGenres(db);
            else result = { error: "Hàm không tồn tại" };
          } catch {
            result = { error: "Lỗi truy vấn dữ liệu" };
          }
          return {
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          };
        })
      );

      conversation.push(...toolResults);

      response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: conversation,
        tools: CHATBOT_TOOLS,
        tool_choice: "auto",
      });
      msg = response.choices[0].message;
    }

    return res.json({ reply: msg.content });
  } catch (err) {
    console.error("[AI /chat]", err.message);
    return res.status(500).json({ error: "Lỗi AI, vui lòng thử lại." });
  }
});

// ─── RECOMMENDATIONS ─────────────────────────────────────────────────────────

router.post("/recommendations", async (req, res) => {
  const { personId, email } = req.body;
  if (!email) return res.status(400).json({ error: "Thiếu email." });

  const cacheKey = `rec_${email}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const db = req.app.get("db");

  try {
    const [history, showing] = await Promise.all([
      helpers.getCustomerHistory(db, email),
      helpers.getCurrentlyShowing(db),
    ]);

    if (showing.length === 0) return res.json({ recommendations: [] });

    const historyText = history.length > 0
      ? history.map((m) => `"${m.name}" (${m.genres})`).join(", ")
      : "Chưa có lịch sử xem phim";

    const showingText = showing
      .map((m) => `ID:${m.id} - "${m.name}" (${m.genres}, rating: ${m.rating})`)
      .join("\n");

    const userPrompt = `Lịch sử xem phim của khách: ${historyText}

Phim đang chiếu tại CGV:
${showingText}

Hãy gợi ý 3 phim phù hợp nhất. Trả về JSON:
{"recommendations":[{"movieId":1,"reason":"lý do ngắn gọn tiếng Việt"}]}`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: prompts.RECOMMENDATIONS_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content);

    // Gắn thêm thông tin phim vào kết quả
    const result = {
      recommendations: (parsed.recommendations || []).map((r) => {
        const movie = showing.find((m) => m.id === r.movieId);
        return { ...r, movie: movie || null };
      }).filter((r) => r.movie !== null),
    };

    cache.set(cacheKey, result, 60 * 60 * 1000); // cache 1h
    return res.json(result);
  } catch (err) {
    console.error("[AI /recommendations]", err.message);
    return res.status(500).json({ error: "Lỗi AI, vui lòng thử lại." });
  }
});

// ─── SEARCH ──────────────────────────────────────────────────────────────────

router.post("/search", async (req, res) => {
  const { query: userQuery } = req.body;
  if (!userQuery || typeof userQuery !== "string") {
    return res.status(400).json({ error: "Thiếu query." });
  }

  const db = req.app.get("db");

  try {
    const [genres, showing] = await Promise.all([
      helpers.getGenres(db),
      helpers.getCurrentlyShowing(db),
    ]);

    const genreList = genres.map((g) => g.genre).join(", ");
    const showingText = showing
      .map((m) => `ID:${m.id} - "${m.name}" (${m.genres})`)
      .join("\n");

    const userPrompt = `Câu tìm kiếm: "${userQuery}"

Thể loại có sẵn: ${genreList}

Phim đang chiếu:
${showingText}

Phân tích câu tìm kiếm và trả về JSON:
{"genres":["thể loại phù hợp"],"movieIds":[id phim phù hợp],"interpretation":"AI hiểu yêu cầu là gì (tiếng Việt, 1 câu)"}`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: prompts.SEARCH_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content);

    const matchedMovies = showing.filter((m) =>
      (parsed.movieIds || []).includes(m.id)
    );

    return res.json({
      movies: matchedMovies,
      genres: parsed.genres || [],
      interpretation: parsed.interpretation || "",
    });
  } catch (err) {
    console.error("[AI /search]", err.message);
    return res.status(500).json({ error: "Lỗi AI, vui lòng thử lại." });
  }
});

// ─── ADMIN: SINH MÔ TẢ PHIM ──────────────────────────────────────────────────

router.post("/admin/generateDescription", async (req, res) => {
  const { name, genres, director, duration, rating } = req.body;
  if (!name) return res.status(400).json({ error: "Thiếu tên phim." });

  try {
    const userPrompt = `Tên phim: ${name}
Thể loại: ${genres || "Chưa rõ"}
Đạo diễn: ${director || "Chưa rõ"}
Thời lượng: ${duration ? duration + " phút" : "Chưa rõ"}
Xếp hạng: ${rating || "Chưa rõ"}

Viết mô tả phim hấp dẫn bằng tiếng Việt (2-3 câu) để hiển thị trên website CGV.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: prompts.ADMIN_DESCRIPTION_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    });

    return res.json({ description: response.choices[0].message.content.trim() });
  } catch (err) {
    console.error("[AI /admin/generateDescription]", err.message);
    return res.status(500).json({ error: "Lỗi AI, vui lòng thử lại." });
  }
});

// ─── ADMIN: ANALYTICS ────────────────────────────────────────────────────────

router.get("/admin/analytics", async (req, res) => {
  const cacheKey = "admin_analytics";
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const db = req.app.get("db");

  try {
    const stats = await helpers.getRevenueStats(db);

    const userPrompt = `Dữ liệu kinh doanh CGV:
- Tổng doanh thu: ${stats.totalRevenue.toLocaleString("vi-VN")} VNĐ
- Tổng vé đã bán: ${stats.totalTickets}
- Tổng khách hàng: ${stats.totalCustomers}
- Top 5 phim bán chạy: ${stats.topMovies.map((m) => `${m.name} (${m.tickets_sold} vé)`).join(", ")}
- 5 phim bán chậm nhất: ${stats.slowMovies.map((m) => `${m.name} (${m.tickets_sold} vé)`).join(", ")}

Đưa ra 3-4 nhận xét và gợi ý cải thiện kinh doanh ngắn gọn bằng tiếng Việt.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: prompts.ADMIN_ANALYTICS_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    });

    const result = {
      stats,
      insights: response.choices[0].message.content.trim(),
    };

    cache.set(cacheKey, result, 30 * 60 * 1000); // cache 30 phút
    return res.json(result);
  } catch (err) {
    console.error("[AI /admin/analytics]", err.message);
    return res.status(500).json({ error: "Lỗi AI, vui lòng thử lại." });
  }
});

module.exports = router;
