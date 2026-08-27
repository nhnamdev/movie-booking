const bcrypt = require("bcryptjs");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^0\d{9}$/;

const createAuthController = ({
  queryDbAsync,
  withTransaction,
  signSession,
  setSessionCookie,
  clearSessionCookie,
  publicUser,
}) => {
  const registration = async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const password = String(req.body.password || "");
    const phoneNumber = String(req.body.phoneNumber || "").trim();

    if (!EMAIL_PATTERN.test(email) || email.length > 100 || !firstName || !lastName || firstName.length > 100 || lastName.length > 100) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ họ tên và email hợp lệ" });
    }
    if (!PHONE_PATTERN.test(phoneNumber)) {
      return res.status(400).json({ message: "Số điện thoại Việt Nam phải bắt đầu bằng 0 và đủ 10 chữ số" });
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số" });
    }

    let transaction;
    try {
      transaction = await withTransaction();
      const existing = await transaction.query(
        "SELECT email FROM person WHERE email = ? OR phone_number = ? FOR UPDATE",
        [email, phoneNumber]
      );
      if (existing.length > 0) {
        await transaction.rollback();
        transaction.release();
        transaction = null;
        return res.status(409).json({ message: "Email hoặc số điện thoại đã được đăng ký" });
      }
      const passwordHash = await bcrypt.hash(password, 12);
      await transaction.query(
        `INSERT INTO person
          (email, first_name, last_name, password, phone_number, person_type, account_status)
         VALUES (?, ?, ?, ?, ?, 'Customer', 'active')`,
        [email, firstName, lastName, passwordHash, phoneNumber]
      );
      await transaction.query(
        "INSERT IGNORE INTO reward_account (customer_email) VALUES (?)",
        [email]
      );
      await transaction.commit();
      transaction.release();
      transaction = null;

      const newUser = {
        email,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        person_type: "Customer",
        account_status: "active",
      };
      setSessionCookie(res, signSession(newUser));

      return res.status(201).json({
        message: "Chúc mừng! Đăng ký và đăng nhập thành công",
        user: publicUser(newUser),
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback().catch(() => {});
        transaction.release();
      }
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "Email hoặc số điện thoại đã được đăng ký" });
      }
      console.error("Registration error:", err.message);
      return res.status(500).json({ message: "Không thể tạo tài khoản lúc này" });
    }
  };

  const login = async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu" });
    }
    try {
      const rows = await queryDbAsync(
        `SELECT email, first_name, last_name, phone_number, person_type, password, account_status
         FROM person WHERE email = ? LIMIT 1`,
        [email]
      );
      const user = rows[0];
      const valid = user ? await bcrypt.compare(password, user.password) : false;
      if (!valid) {
        return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
      }
      if (user.account_status !== "active") {
        return res.status(403).json({ message: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên." });
      }
      setSessionCookie(res, signSession(user));
      return res.json({ user: publicUser(user) });
    } catch (err) {
      console.error("Login error:", err.message);
      return res.status(500).json({ message: "Không thể đăng nhập lúc này" });
    }
  };

  const me = (req, res) => res.json({ user: req.user || null });
  const logout = (req, res) => {
    clearSessionCookie(res);
    return res.json({ success: true });
  };

  return { registration, login, me, logout };
};

module.exports = createAuthController;
