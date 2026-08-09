// Chỉ Admin được tạo, sửa hoặc khóa tài khoản nhân viên.
const createStaffManagementController = ({ requireAdmin, adminAuthFailed, listStaff, upsertStaff }) => {
  const authorized = async (req, res) => {
    const allowed = await requireAdmin(req.body.email, req.body.password);
    if (!allowed) adminAuthFailed(res);
    return allowed;
  };
  const respondError = (res, err, fallback) =>
    res.status(err.statusCode || 500).json({ message: err.message || fallback });

  const adminStaffList = async (req, res) => {
    try {
      if (!(await authorized(req, res))) return;
      return res.json(await listStaff());
    } catch (err) {
      return respondError(res, err, "Không thể tải danh sách nhân viên");
    }
  };

  const adminStaffUpsert = async (req, res) => {
    try {
      if (!(await authorized(req, res))) return;
      const staffEmail = await upsertStaff(req.body);
      return res.json({ staffEmail });
    } catch (err) {
      return respondError(res, err, "Không thể lưu nhân viên");
    }
  };

  return { adminStaffList, adminStaffUpsert };
};

module.exports = createStaffManagementController;
