// Quản lý tài khoản nhân viên; vai trò Staff không thể tự cấp hoặc đổi quyền.
const bcrypt = require("bcryptjs");

const createStaffManagementService = ({ queryDbAsync }) => {
  const normalizeText = (value, label, maxLength) => {
    const text = String(value || "").trim();
    if (!text || text.length > maxLength) {
      const err = new Error(`${label} không hợp lệ`);
      err.statusCode = 400;
      throw err;
    }
    return text;
  };

  const listStaff = () =>
    queryDbAsync(
      `SELECT email, first_name, last_name, phone_number, account_status
       FROM person WHERE person_type = 'Staff'
       ORDER BY account_status, first_name, last_name, email`
    );

  const upsertStaff = async ({ originalEmail, staffEmail, firstName, lastName, phoneNumber, staffPassword, accountStatus }) => {
    const normalizedEmail = normalizeText(staffEmail, "Email", 100).toLowerCase();
    const normalizedFirstName = normalizeText(firstName, "Tên", 100);
    const normalizedLastName = normalizeText(lastName, "Họ", 100);
    const normalizedPhone = String(phoneNumber || "").trim();
    const normalizedStatus = accountStatus === "inactive" ? "inactive" : "active";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      const err = new Error("Email nhân viên không hợp lệ");
      err.statusCode = 400;
      throw err;
    }
    if (!/^0\d{9}$/.test(normalizedPhone)) {
      const err = new Error("Số điện thoại phải bắt đầu bằng 0 và đủ 10 chữ số");
      err.statusCode = 400;
      throw err;
    }

    if (originalEmail) {
      const currentEmail = String(originalEmail).trim().toLowerCase();
      const existing = await queryDbAsync(
        "SELECT email FROM person WHERE email = ? AND person_type = 'Staff' LIMIT 1",
        [currentEmail]
      );
      if (existing.length === 0) {
        const err = new Error("Không tìm thấy nhân viên");
        err.statusCode = 404;
        throw err;
      }
      if (normalizedEmail !== currentEmail) {
        const duplicate = await queryDbAsync("SELECT email FROM person WHERE email = ? LIMIT 1", [normalizedEmail]);
        if (duplicate.length > 0) {
          const err = new Error("Email đã được sử dụng");
          err.statusCode = 409;
          throw err;
        }
      }
      const phoneDuplicate = await queryDbAsync(
        "SELECT email FROM person WHERE phone_number = ? AND email <> ? LIMIT 1",
        [normalizedPhone, currentEmail]
      );
      if (phoneDuplicate.length > 0) {
        const err = new Error("Số điện thoại đã được sử dụng");
        err.statusCode = 409;
        throw err;
      }
      const normalizedPassword = String(staffPassword || "").trim();
      if (normalizedPassword && (normalizedPassword.length < 8 || !/[A-Za-z]/.test(normalizedPassword) || !/\d/.test(normalizedPassword))) {
        const err = new Error("Mật khẩu nhân viên phải có ít nhất 8 ký tự, gồm chữ và số");
        err.statusCode = 400;
        throw err;
      }
      const params = [
        normalizedEmail,
        normalizedFirstName,
        normalizedLastName,
        normalizedPhone,
        normalizedStatus,
      ];
      let passwordSql = "";
      if (normalizedPassword) {
        passwordSql = ", password = ?";
        params.push(await bcrypt.hash(normalizedPassword, 12));
      }
      params.push(currentEmail);
      await queryDbAsync(
        `UPDATE person SET email = ?, first_name = ?, last_name = ?, phone_number = ?,
          account_status = ?${passwordSql}
         WHERE email = ? AND person_type = 'Staff'`,
        params
      );
      return normalizedEmail;
    }

    const normalizedPassword = normalizeText(staffPassword, "Mật khẩu", 100);
    if (normalizedPassword.length < 8 || !/[A-Za-z]/.test(normalizedPassword) || !/\d/.test(normalizedPassword)) {
      const err = new Error("Mật khẩu nhân viên phải có ít nhất 8 ký tự, gồm chữ và số");
      err.statusCode = 400;
      throw err;
    }
    const duplicate = await queryDbAsync(
      "SELECT email FROM person WHERE email = ? OR phone_number = ? LIMIT 1",
      [normalizedEmail, normalizedPhone]
    );
    if (duplicate.length > 0) {
      const err = new Error("Email hoặc số điện thoại đã được sử dụng");
      err.statusCode = 409;
      throw err;
    }
    await queryDbAsync(
      `INSERT INTO person
        (email, first_name, last_name, password, phone_number, account_balance, person_type, account_status)
       VALUES(?,?,?,?,?,0,'Staff',?)`,
      [normalizedEmail, normalizedFirstName, normalizedLastName, await bcrypt.hash(normalizedPassword, 12), normalizedPhone, normalizedStatus]
    );
    return normalizedEmail;
  };

  return { listStaff, upsertStaff };
};

module.exports = createStaffManagementService;
