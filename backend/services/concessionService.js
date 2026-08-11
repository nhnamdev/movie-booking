// Xử lý danh mục và định giá đơn bắp nước mua độc lập với vé xem phim.
const createConcessionService = ({ queryDbAsync }) => {
  const normalizeItems = (items) => {
    if (!Array.isArray(items)) return [];

    const quantities = new Map();
    items.forEach((item) => {
      const comboId = Number(item?.comboId);
      const quantity = Number(item?.quantity);
      if (!Number.isInteger(comboId) || comboId <= 0) return;
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 10) return;
      quantities.set(comboId, Math.min(10, (quantities.get(comboId) || 0) + quantity));
    });
    return [...quantities].map(([comboId, quantity]) => ({ comboId, quantity }));
  };

  const getCatalog = async (theatreId) => {
    const theatres = await queryDbAsync(
      `SELECT id, name, location, location_details
       FROM theatre WHERE status = 'active' ORDER BY location, name`
    );
    const normalizedTheatreId = Number(theatreId || theatres[0]?.id);
    const theatre = theatres.find((item) => Number(item.id) === normalizedTheatreId);
    if (!theatre) {
      const err = new Error("Chi nhánh không tồn tại hoặc đã ngừng hoạt động");
      err.statusCode = 404;
      throw err;
    }

    const products = await queryDbAsync(
      `SELECT C.id, C.name, C.description, C.category, C.image_url,
        COALESCE(BC.price_override, C.base_price) AS base_price
       FROM concession_combo C
       JOIN branch_combo BC ON BC.combo_id = C.id AND BC.theatre_id = ?
       WHERE C.is_active = 1 AND BC.is_available = 1
       ORDER BY C.category, C.id`,
      [normalizedTheatreId]
    );

    return {
      theatres,
      selectedTheatre: theatre,
      categories: [...new Set(products.map((item) => item.category || "Combo bắp nước"))],
      products: products.map((item) => ({
        ...item,
        id: Number(item.id),
        base_price: Number(item.base_price),
      })),
    };
  };

  const buildConcessionOrderPayload = async ({ email, theatreId, items, paymentMethod }) => {
    const normalizedEmail = String(email || "").trim();
    const selection = normalizeItems(items);
    if (!normalizedEmail || selection.length === 0 || selection.length !== items.length) {
      const err = new Error("Đơn bắp nước không hợp lệ");
      err.statusCode = 400;
      throw err;
    }

    const catalog = await getCatalog(theatreId);
    const productById = new Map(catalog.products.map((product) => [product.id, product]));
    if (selection.some((item) => !productById.has(item.comboId))) {
      const err = new Error("Một hoặc nhiều sản phẩm không còn được bán");
      err.statusCode = 409;
      throw err;
    }

    const comboItems = selection.map(({ comboId, quantity }) => {
      const product = productById.get(comboId);
      return {
        comboId,
        name: product.name,
        description: product.description,
        category: product.category,
        imageUrl: product.image_url || null,
        quantity,
        basePrice: product.base_price,
        discountPercent: 0,
        discountAmount: 0,
        finalUnitPrice: product.base_price,
        lineTotal: product.base_price * quantity,
        promotionLabel: null,
      };
    });
    const amount = comboItems.reduce((sum, item) => sum + item.lineTotal, 0);

    return {
      amount,
      payload: {
        orderType: "CONCESSION",
        email: normalizedEmail,
        theatreId: Number(catalog.selectedTheatre.id),
        theatreName: catalog.selectedTheatre.name,
        theatreAddress: catalog.selectedTheatre.location_details,
        comboItems,
        comboSubtotal: amount,
        comboDiscount: 0,
        comboTotal: amount,
        ticketSubtotal: 0,
        amount,
        paymentMethod,
      },
    };
  };

  return { getConcessionCatalog: getCatalog, buildConcessionOrderPayload };
};

module.exports = createConcessionService;
