// Quản lý cấu trúc chi nhánh, phòng, sơ đồ ghế và danh mục combo.
const createCinemaManagementService = ({ queryDbAsync, withTransaction }) => {
  const requiredText = (value, label, maxLength = 255) => {
    const text = String(value || "").trim();
    if (!text || text.length > maxLength) {
      const err = new Error(`${label} không hợp lệ`);
      err.statusCode = 400;
      throw err;
    }
    return text;
  };

  const getCinemaStructure = async () => {
    const theatres = await queryDbAsync(
      `SELECT id, name, location, location_details, status
       FROM theatre ORDER BY name, id`
    );
    const halls = await queryDbAsync(
      `SELECT H.id, H.name, H.total_seats, H.theatre_id, H.status,
        COUNT(CASE WHEN HS.is_active = 1 THEN 1 END) AS configured_seats,
        COUNT(CASE WHEN HS.is_active = 1 AND HS.seat_type = 'VIP' THEN 1 END) AS vip_seats
       FROM hall H
       LEFT JOIN hallwise_seat HS ON HS.hall_id = H.id
       GROUP BY H.id, H.name, H.total_seats, H.theatre_id, H.status
       ORDER BY H.theatre_id, H.name, H.id`
    );

    return theatres.map((theatre) => ({
      ...theatre,
      halls: halls
        .filter((hall) => Number(hall.theatre_id) === Number(theatre.id))
        .map((hall) => ({
          ...hall,
          total_seats: Number(hall.configured_seats || hall.total_seats || 0),
          vip_seats: Number(hall.vip_seats || 0),
        })),
    }));
  };

  const upsertTheatre = async ({ theatreId, name, location, locationDetails, status }) => {
    const normalizedName = requiredText(name, "Tên chi nhánh", 100);
    const normalizedLocation = requiredText(location, "Khu vực", 100);
    const normalizedDetails = requiredText(locationDetails, "Địa chỉ", 500);
    const normalizedStatus = status === "inactive" ? "inactive" : "active";

    if (theatreId) {
      const result = await queryDbAsync(
        `UPDATE theatre SET name = ?, location = ?, location_details = ?, status = ?
         WHERE id = ?`,
        [normalizedName, normalizedLocation, normalizedDetails, normalizedStatus, Number(theatreId)]
      );
      if (result.affectedRows === 0) {
        const err = new Error("Không tìm thấy chi nhánh");
        err.statusCode = 404;
        throw err;
      }
      return Number(theatreId);
    }

    const result = await queryDbAsync(
      "INSERT INTO theatre(name, location, location_details, status) VALUES(?,?,?,?)",
      [normalizedName, normalizedLocation, normalizedDetails, normalizedStatus]
    );
    return result.insertId;
  };

  const deleteTheatre = async (theatreId) => {
    const halls = await queryDbAsync("SELECT COUNT(*) AS value FROM hall WHERE theatre_id = ?", [
      Number(theatreId),
    ]);
    if (Number(halls[0].value) > 0) {
      const err = new Error("Hãy xóa hoặc chuyển các phòng trước khi xóa chi nhánh");
      err.statusCode = 409;
      throw err;
    }
    await queryDbAsync("DELETE FROM features WHERE theatre_id = ?", [Number(theatreId)]);
    const result = await queryDbAsync("DELETE FROM theatre WHERE id = ?", [Number(theatreId)]);
    if (result.affectedRows === 0) {
      const err = new Error("Không tìm thấy chi nhánh");
      err.statusCode = 404;
      throw err;
    }
  };

  const upsertHall = async ({ hallId, theatreId, name, status }) => {
    const normalizedName = requiredText(name, "Tên phòng", 100);
    const normalizedStatus = status === "inactive" ? "inactive" : "active";
    const normalizedTheatreId = Number(theatreId);
    const theatreRows = await queryDbAsync("SELECT id FROM theatre WHERE id = ?", [
      normalizedTheatreId,
    ]);
    if (theatreRows.length === 0) {
      const err = new Error("Không tìm thấy chi nhánh");
      err.statusCode = 404;
      throw err;
    }

    if (hallId) {
      const dependencies = await queryDbAsync(
        `SELECT
          (SELECT COUNT(*) FROM shown_in WHERE hall_id = ?) AS show_count,
          (SELECT COUNT(*) FROM ticket WHERE hall_id = ?) AS ticket_count`,
        [Number(hallId), Number(hallId)]
      );
      const currentRows = await queryDbAsync("SELECT theatre_id FROM hall WHERE id = ?", [
        Number(hallId),
      ]);
      if (currentRows.length === 0) {
        const err = new Error("Không tìm thấy phòng chiếu");
        err.statusCode = 404;
        throw err;
      }
      if (
        Number(currentRows[0].theatre_id) !== normalizedTheatreId &&
        (Number(dependencies[0].show_count) > 0 || Number(dependencies[0].ticket_count) > 0)
      ) {
        const err = new Error("Không thể chuyển chi nhánh cho phòng đã có lịch chiếu hoặc vé");
        err.statusCode = 409;
        throw err;
      }
      await queryDbAsync(
        "UPDATE hall SET name = ?, theatre_id = ?, status = ? WHERE id = ?",
        [normalizedName, normalizedTheatreId, normalizedStatus, Number(hallId)]
      );
      return Number(hallId);
    }

    const result = await queryDbAsync(
      "INSERT INTO hall(name, total_seats, theatre_id, status) VALUES(?,0,?,?)",
      [normalizedName, normalizedTheatreId, normalizedStatus]
    );
    return result.insertId;
  };

  const deleteHall = async (hallId) => {
    const dependencies = await queryDbAsync(
      `SELECT
        (SELECT COUNT(*) FROM shown_in WHERE hall_id = ?) AS show_count,
        (SELECT COUNT(*) FROM ticket WHERE hall_id = ?) AS ticket_count`,
      [Number(hallId), Number(hallId)]
    );
    if (Number(dependencies[0].show_count) > 0 || Number(dependencies[0].ticket_count) > 0) {
      const err = new Error("Phòng đã có lịch chiếu hoặc vé; hãy chuyển phòng sang ngừng hoạt động");
      err.statusCode = 409;
      throw err;
    }

    const transaction = await withTransaction();
    try {
      await transaction.query("DELETE FROM hallwise_seat WHERE hall_id = ?", [Number(hallId)]);
      const result = await transaction.query("DELETE FROM hall WHERE id = ?", [Number(hallId)]);
      if (result.affectedRows === 0) {
        const err = new Error("Không tìm thấy phòng chiếu");
        err.statusCode = 404;
        throw err;
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    } finally {
      transaction.release();
    }
  };

  const getHallLayout = async (hallId) => {
    const hallRows = await queryDbAsync(
      `SELECT H.id, H.name, H.total_seats, H.theatre_id, T.name AS theatre_name
       FROM hall H JOIN theatre T ON T.id = H.theatre_id WHERE H.id = ?`,
      [Number(hallId)]
    );
    if (hallRows.length === 0) {
      const err = new Error("Không tìm thấy phòng chiếu");
      err.statusCode = 404;
      throw err;
    }
    const seats = await queryDbAsync(
      `SELECT HS.seat_id, COALESCE(HS.seat_label, S.name) AS seat_label,
        HS.row_index, HS.column_index, HS.seat_type, HS.price_surcharge
       FROM hallwise_seat HS
       JOIN seat S ON S.id = HS.seat_id
       WHERE HS.hall_id = ? AND HS.is_active = 1
       ORDER BY HS.row_index, HS.column_index`,
      [Number(hallId)]
    );
    return { ...hallRows[0], seats };
  };

  const saveHallLayout = async (hallId, seats) => {
    const normalizedHallId = Number(hallId);
    if (!Number.isInteger(normalizedHallId) || !Array.isArray(seats) || seats.length > 500) {
      const err = new Error("Sơ đồ ghế không hợp lệ");
      err.statusCode = 400;
      throw err;
    }

    const positions = new Set();
    const normalizedSeats = seats.map((seat) => {
      const rowIndex = Number(seat.rowIndex);
      const columnIndex = Number(seat.columnIndex);
      const seatType = seat.seatType === "VIP" ? "VIP" : "STANDARD";
      const priceSurcharge = seatType === "VIP" ? Number(seat.priceSurcharge || 0) : 0;
      const positionKey = `${rowIndex}-${columnIndex}`;
      if (
        !Number.isInteger(rowIndex) || rowIndex < 1 || rowIndex > 26 ||
        !Number.isInteger(columnIndex) || columnIndex < 1 || columnIndex > 50 ||
        positions.has(positionKey) ||
        !Number.isInteger(priceSurcharge) || priceSurcharge < 0 || priceSurcharge > 1000000
      ) {
        const err = new Error("Vị trí hoặc phụ thu ghế không hợp lệ");
        err.statusCode = 400;
        throw err;
      }
      positions.add(positionKey);
      return {
        seatId: Number(seat.seatId) || null,
        rowIndex,
        columnIndex,
        seatLabel: `${String.fromCharCode(64 + rowIndex)}${columnIndex}`,
        seatType,
        priceSurcharge,
      };
    });

    const transaction = await withTransaction();
    try {
      const hallRows = await transaction.query("SELECT id FROM hall WHERE id = ? FOR UPDATE", [
        normalizedHallId,
      ]);
      if (hallRows.length === 0) {
        const err = new Error("Không tìm thấy phòng chiếu");
        err.statusCode = 404;
        throw err;
      }
      const currentMappings = await transaction.query(
        "SELECT seat_id FROM hallwise_seat WHERE hall_id = ?",
        [normalizedHallId]
      );
      const currentSeatIds = new Set(currentMappings.map((row) => Number(row.seat_id)));
      await transaction.query("UPDATE hallwise_seat SET is_active = 0 WHERE hall_id = ?", [
        normalizedHallId,
      ]);

      for (const seat of normalizedSeats) {
        let seatId = seat.seatId;
        if (!seatId || !currentSeatIds.has(seatId)) {
          const seatResult = await transaction.query("INSERT INTO seat(name) VALUES(?)", [
            seat.seatLabel,
          ]);
          seatId = seatResult.insertId;
          await transaction.query(
            `INSERT INTO hallwise_seat
              (hall_id, seat_id, seat_label, row_index, column_index, seat_type, price_surcharge, is_active)
             VALUES(?,?,?,?,?,?,?,1)`,
            [
              normalizedHallId,
              seatId,
              seat.seatLabel,
              seat.rowIndex,
              seat.columnIndex,
              seat.seatType,
              seat.priceSurcharge,
            ]
          );
        } else {
          await transaction.query(
            `UPDATE hallwise_seat
             SET seat_label = ?, row_index = ?, column_index = ?, seat_type = ?,
               price_surcharge = ?, is_active = 1
             WHERE hall_id = ? AND seat_id = ?`,
            [
              seat.seatLabel,
              seat.rowIndex,
              seat.columnIndex,
              seat.seatType,
              seat.priceSurcharge,
              normalizedHallId,
              seatId,
            ]
          );
        }
      }

      await transaction.query("UPDATE hall SET total_seats = ? WHERE id = ?", [
        normalizedSeats.length,
        normalizedHallId,
      ]);
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    } finally {
      transaction.release();
    }
  };

  const getComboManagement = async () => {
    const combos = await queryDbAsync(
      `SELECT id, name, description, category, image_url, base_price, is_active
       FROM concession_combo ORDER BY category, id`
    );
    const promotions = await queryDbAsync(
      `SELECT MCP.id, MCP.movie_id, M.name AS movie_name, MCP.combo_id,
        C.name AS combo_name, MCP.discount_percent, MCP.promotion_label,
        MCP.start_at, MCP.end_at, MCP.is_active
       FROM movie_combo_promotion MCP
       JOIN movie M ON M.id = MCP.movie_id
       JOIN concession_combo C ON C.id = MCP.combo_id
       ORDER BY M.name, C.name`
    );
    const movies = await queryDbAsync("SELECT id, name FROM movie ORDER BY name");
    return { combos, promotions, movies };
  };

  const upsertCombo = async ({
    comboId,
    name,
    description,
    category,
    imageUrl,
    basePrice,
    isActive,
  }) => {
    const normalizedName = requiredText(name, "Tên combo", 100);
    const normalizedDescription = requiredText(description, "Mô tả combo", 255);
    const normalizedCategory = requiredText(category || "Combo bắp nước", "Nhóm sản phẩm", 80);
    const normalizedImageUrl = String(imageUrl || "").trim();
    if (normalizedImageUrl.length > 500) {
      const err = new Error("Đường dẫn ảnh quá dài");
      err.statusCode = 400;
      throw err;
    }
    const normalizedPrice = Number(basePrice);
    if (!Number.isInteger(normalizedPrice) || normalizedPrice < 0 || normalizedPrice > 10000000) {
      const err = new Error("Giá combo không hợp lệ");
      err.statusCode = 400;
      throw err;
    }
    if (comboId) {
      const result = await queryDbAsync(
        `UPDATE concession_combo
         SET name = ?, description = ?, category = ?, image_url = ?, base_price = ?, is_active = ?
         WHERE id = ?`,
        [
          normalizedName,
          normalizedDescription,
          normalizedCategory,
          normalizedImageUrl || null,
          normalizedPrice,
          isActive === false ? 0 : 1,
          Number(comboId),
        ]
      );
      if (result.affectedRows === 0) {
        const err = new Error("Không tìm thấy combo");
        err.statusCode = 404;
        throw err;
      }
      return Number(comboId);
    }
    const result = await queryDbAsync(
      `INSERT INTO concession_combo
        (name, description, category, image_url, base_price, is_active)
       VALUES(?,?,?,?,?,?)`,
      [
        normalizedName,
        normalizedDescription,
        normalizedCategory,
        normalizedImageUrl || null,
        normalizedPrice,
        isActive === false ? 0 : 1,
      ]
    );
    return result.insertId;
  };

  const upsertComboPromotion = async ({
    movieId,
    comboId,
    discountPercent,
    promotionLabel,
    startAt,
    endAt,
    isActive,
  }) => {
    const normalizedMovieId = Number(movieId);
    const normalizedComboId = Number(comboId);
    const discount = Number(discountPercent);
    if (
      !Number.isInteger(normalizedMovieId) || normalizedMovieId <= 0 ||
      !Number.isInteger(normalizedComboId) || normalizedComboId <= 0 ||
      !Number.isFinite(discount) || discount < 0 || discount > 100
    ) {
      const err = new Error("Phim, combo hoặc phần trăm giảm giá không hợp lệ");
      err.statusCode = 400;
      throw err;
    }
    const normalizedStartAt = startAt ? String(startAt).replace("T", " ") : null;
    const normalizedEndAt = endAt ? String(endAt).replace("T", " ") : null;
    if (
      normalizedStartAt &&
      normalizedEndAt &&
      new Date(normalizedStartAt).getTime() > new Date(normalizedEndAt).getTime()
    ) {
      const err = new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
      err.statusCode = 400;
      throw err;
    }
    const references = await queryDbAsync(
      `SELECT
        (SELECT COUNT(*) FROM movie WHERE id = ?) AS movie_count,
        (SELECT COUNT(*) FROM concession_combo WHERE id = ?) AS combo_count`,
      [normalizedMovieId, normalizedComboId]
    );
    if (Number(references[0].movie_count) === 0 || Number(references[0].combo_count) === 0) {
      const err = new Error("Phim hoặc combo không tồn tại");
      err.statusCode = 404;
      throw err;
    }
    await queryDbAsync(
      `INSERT INTO movie_combo_promotion
        (movie_id, combo_id, discount_percent, promotion_label, start_at, end_at, is_active)
       VALUES(?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE discount_percent = VALUES(discount_percent),
         promotion_label = VALUES(promotion_label), start_at = VALUES(start_at),
         end_at = VALUES(end_at), is_active = VALUES(is_active)`,
      [
        normalizedMovieId,
        normalizedComboId,
        discount,
        String(promotionLabel || "Ưu đãi combo theo phim").trim(),
        normalizedStartAt,
        normalizedEndAt,
        isActive === false ? 0 : 1,
      ]
    );
  };

  const deleteComboPromotion = async (promotionId) => {
    const result = await queryDbAsync("DELETE FROM movie_combo_promotion WHERE id = ?", [
      Number(promotionId),
    ]);
    if (result.affectedRows === 0) {
      const err = new Error("Không tìm thấy khuyến mãi combo");
      err.statusCode = 404;
      throw err;
    }
  };

  return {
    getCinemaStructure,
    upsertTheatre,
    deleteTheatre,
    upsertHall,
    deleteHall,
    getHallLayout,
    saveHallLayout,
    getComboManagement,
    upsertCombo,
    upsertComboPromotion,
    deleteComboPromotion,
  };
};

module.exports = createCinemaManagementService;
