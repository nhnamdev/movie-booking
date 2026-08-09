// Điều phối các thao tác quản trị chi nhánh, phòng, ghế và combo.
const createCinemaManagementController = (dependencies) => {
  const {
    requireAdmin,
    adminAuthFailed,
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
  } = dependencies;

  const authorized = async (req, res) => {
    const isAdmin = await requireAdmin(req.body.email, req.body.password);
    if (!isAdmin) adminAuthFailed(res);
    return isAdmin;
  };

  const respondError = (res, err, fallback) =>
    res.status(err.statusCode || 500).json({ message: err.message || fallback });

  const adminCinemaStructure = async (req, res) => {
    try {
      if (!(await authorized(req, res))) return;
      return res.json(await getCinemaStructure());
    } catch (err) {
      return respondError(res, err, "Không thể tải cấu trúc rạp");
    }
  };

  const adminTheatreUpsert = async (req, res) => {
    try {
      if (!(await authorized(req, res))) return;
      const theatreId = await upsertTheatre({
        ...req.body,
        status: req.body.cinemaStatus || req.body.status,
      });
      return res.json({ theatreId });
    } catch (err) {
      return respondError(res, err, "Không thể lưu chi nhánh");
    }
  };

  const adminTheatreDelete = async (req, res) => {
    try {
      if (!(await authorized(req, res))) return;
      await deleteTheatre(req.body.theatreId);
      return res.json({ success: true });
    } catch (err) {
      return respondError(res, err, "Không thể xóa chi nhánh");
    }
  };

  const adminHallUpsert = async (req, res) => {
    try {
      if (!(await authorized(req, res))) return;
      const hallId = await upsertHall({
        ...req.body,
        status: req.body.cinemaStatus || req.body.status,
      });
      return res.json({ hallId });
    } catch (err) {
      return respondError(res, err, "Không thể lưu phòng chiếu");
    }
  };

  const adminHallDelete = async (req, res) => {
    try {
      if (!(await authorized(req, res))) return;
      await deleteHall(req.body.hallId);
      return res.json({ success: true });
    } catch (err) {
      return respondError(res, err, "Không thể xóa phòng chiếu");
    }
  };

  const adminHallLayout = async (req, res) => {
    try {
      if (!(await authorized(req, res))) return;
      return res.json(await getHallLayout(req.body.hallId));
    } catch (err) {
      return respondError(res, err, "Không thể tải sơ đồ ghế");
    }
  };

  const adminHallLayoutSave = async (req, res) => {
    try {
      if (!(await authorized(req, res))) return;
      await saveHallLayout(req.body.hallId, req.body.seats);
      return res.json({ success: true });
    } catch (err) {
      return respondError(res, err, "Không thể lưu sơ đồ ghế");
    }
  };

  const adminComboManagement = async (req, res) => {
    try {
      if (!(await authorized(req, res))) return;
      return res.json(await getComboManagement());
    } catch (err) {
      return respondError(res, err, "Không thể tải quản lý combo");
    }
  };

  const adminComboUpsert = async (req, res) => {
    try {
      if (!(await authorized(req, res))) return;
      const comboId = await upsertCombo(req.body);
      return res.json({ comboId });
    } catch (err) {
      return respondError(res, err, "Không thể lưu combo");
    }
  };

  const adminComboPromotionUpsert = async (req, res) => {
    try {
      if (!(await authorized(req, res))) return;
      await upsertComboPromotion(req.body);
      return res.json({ success: true });
    } catch (err) {
      return respondError(res, err, "Không thể lưu khuyến mãi combo");
    }
  };

  const adminComboPromotionDelete = async (req, res) => {
    try {
      if (!(await authorized(req, res))) return;
      await deleteComboPromotion(req.body.promotionId);
      return res.json({ success: true });
    } catch (err) {
      return respondError(res, err, "Không thể xóa khuyến mãi combo");
    }
  };

  return {
    adminCinemaStructure,
    adminTheatreUpsert,
    adminTheatreDelete,
    adminHallUpsert,
    adminHallDelete,
    adminHallLayout,
    adminHallLayoutSave,
    adminComboManagement,
    adminComboUpsert,
    adminComboPromotionUpsert,
    adminComboPromotionDelete,
  };
};

module.exports = createCinemaManagementController;
