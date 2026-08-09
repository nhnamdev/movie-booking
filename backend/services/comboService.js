// Đọc danh mục combo và tính giá khuyến mãi theo phim tại backend.
const createComboService = ({ queryDbAsync }) => {
  const normalizeComboSelection = (comboItems) => {
    if (!Array.isArray(comboItems)) return [];

    const quantities = new Map();
    comboItems.forEach((item) => {
      const comboId = Number(item?.comboId);
      const quantity = Number(item?.quantity);
      if (!Number.isInteger(comboId) || comboId <= 0) return;
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 10) return;
      quantities.set(comboId, Math.min(10, (quantities.get(comboId) || 0) + quantity));
    });

    return [...quantities].map(([comboId, quantity]) => ({ comboId, quantity }));
  };

  const comboPricingSql = `
    SELECT
      C.id,
      C.name,
      C.description,
      C.base_price,
      COALESCE(MCP.discount_percent, 0) AS discount_percent,
      MCP.promotion_label
    FROM concession_combo C
    LEFT JOIN movie_combo_promotion MCP
      ON MCP.combo_id = C.id
      AND MCP.movie_id = ?
      AND MCP.is_active = 1
      AND (MCP.start_at IS NULL OR MCP.start_at <= NOW())
      AND (MCP.end_at IS NULL OR MCP.end_at >= NOW())
    WHERE C.is_active = 1`;

  const toPricedCombo = (row) => {
    const basePrice = Number(row.base_price);
    const discountPercent = Math.min(100, Math.max(0, Number(row.discount_percent || 0)));
    const finalPrice = Math.round(basePrice * (1 - discountPercent / 100));

    return {
      id: Number(row.id),
      name: row.name,
      description: row.description,
      base_price: basePrice,
      discount_percent: discountPercent,
      discount_amount: basePrice - finalPrice,
      final_price: finalPrice,
      promotion_label: row.promotion_label || null,
      is_promotional: discountPercent > 0,
    };
  };

  const getMovieCombos = async (movieId) => {
    const normalizedMovieId = Number(movieId);
    if (!Number.isInteger(normalizedMovieId) || normalizedMovieId <= 0) {
      const err = new Error("Mã phim không hợp lệ");
      err.statusCode = 400;
      throw err;
    }

    const movieRows = await queryDbAsync("SELECT id FROM movie WHERE id = ? LIMIT 1", [
      normalizedMovieId,
    ]);
    if (movieRows.length === 0) {
      const err = new Error("Không tìm thấy phim");
      err.statusCode = 404;
      throw err;
    }

    const rows = await queryDbAsync(`${comboPricingSql} ORDER BY C.id`, [normalizedMovieId]);
    const combos = rows.map(toPricedCombo);

    return {
      movieId: normalizedMovieId,
      hasPromotion: combos.some((combo) => combo.is_promotional),
      combos,
    };
  };

  const priceComboSelection = async (movieId, comboItems) => {
    if (!Array.isArray(comboItems)) {
      const err = new Error("Danh sách combo không hợp lệ");
      err.statusCode = 400;
      throw err;
    }
    const invalidItem = comboItems.some((item) => {
      const comboId = Number(item?.comboId);
      const quantity = Number(item?.quantity);
      return (
        !Number.isInteger(comboId) ||
        comboId <= 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        quantity > 10
      );
    });
    if (invalidItem) {
      const err = new Error("Mỗi combo chỉ được chọn từ 1 đến 10 phần");
      err.statusCode = 400;
      throw err;
    }

    const selection = normalizeComboSelection(comboItems);
    if (selection.length === 0) {
      return {
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
      };
    }

    const catalog = await getMovieCombos(movieId);
    const comboById = new Map(catalog.combos.map((combo) => [combo.id, combo]));

    if (selection.some(({ comboId }) => !comboById.has(comboId))) {
      const err = new Error("Một hoặc nhiều combo không còn được bán");
      err.statusCode = 409;
      throw err;
    }

    const items = selection.map(({ comboId, quantity }) => {
      const combo = comboById.get(comboId);
      return {
        comboId,
        name: combo.name,
        description: combo.description,
        quantity,
        basePrice: combo.base_price,
        discountPercent: combo.discount_percent,
        discountAmount: combo.discount_amount * quantity,
        finalUnitPrice: combo.final_price,
        lineTotal: combo.final_price * quantity,
        promotionLabel: combo.promotion_label,
      };
    });

    return {
      items,
      subtotal: items.reduce((sum, item) => sum + item.basePrice * item.quantity, 0),
      discount: items.reduce((sum, item) => sum + item.discountAmount, 0),
      total: items.reduce((sum, item) => sum + item.lineTotal, 0),
    };
  };

  return {
    normalizeComboSelection,
    getMovieCombos,
    priceComboSelection,
  };
};

module.exports = createComboService;
