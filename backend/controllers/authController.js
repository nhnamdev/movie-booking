// Xử lý đăng ký và đăng nhập tài khoản.
const createAuthController = (dependencies) => {
  const {
    db,
    queryDbAsync,
    getPayOSClient,
    parsePayOSOrderPayload,
    generatePayOSOrderCode,
    normalizeSeatIds,
    getHeldOrderSeatIds,
    buildPaymentOrderPayload,
    finalizePaymentOrderTickets,
    frontendUrl,
    maskEmail,
    logRegisterDebug,
    verifyAdmin,
    adminAuthFailed,
    queryDb,
    requireAdmin,
    normalizeAdminList,
    toAdminOrder,
    uploadToR2,
    generateFileName,
  } = dependencies;

  // Kiểm tra dữ liệu và tạo tài khoản khách hàng mới.
  const registration = (req, res) => {
  const email = req.body.email;
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const password = req.body.password;
  const phoneNumber = String(req.body.phoneNumber || "").trim();

  logRegisterDebug("Incoming request", {
    method: req.method,
    path: req.originalUrl,
    origin: req.headers.origin,
    ip: req.ip,
  });

  logRegisterDebug("Payload summary", {
    email: maskEmail(email),
    firstName,
    lastName,
    phoneNumberLength: String(phoneNumber || "").length,
    hasPassword: Boolean(password),
    passwordLength: String(password || "").length,
  });

  if (!/^0\d{9}$/.test(phoneNumber)) {
    return res.status(400).json({
      message: "Số điện thoại Việt Nam phải bắt đầu bằng 0 và đủ 10 chữ số",
    });
  }

  const checkSql = "SELECT email FROM person WHERE email = ?";
  db.query(checkSql, [email], (checkErr, checkData) => {
    if (checkErr) {
      logRegisterDebug("Check email failed", checkErr);
      return res.status(500).json({ message: "Sorry, Please try again!" });
    }

    if (checkData.length > 0) {
      return res.status(409).json({
        message: "Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập.",
      });
    }

    const sql = `INSERT INTO person (email, first_name, last_name, password, phone_number, person_type) VALUES (?, ?, ?, ?, ?, 'Customer')`;

    logRegisterDebug("Executing SQL", {
      sql,
      paramsPreview: [maskEmail(email), firstName, lastName, "***", phoneNumber],
    });

    db.query(
      sql,
      [email, firstName, lastName, password, phoneNumber],
      (err, data) => {
        if (err) {
          logRegisterDebug("Insert failed", {
            message: err.message,
            code: err.code,
            errno: err.errno,
            sqlState: err.sqlState,
          });
          return res.status(500).json({ message: "Sorry, Please try again!" });
        }

        logRegisterDebug("Insert success", {
          affectedRows: data?.affectedRows,
          insertId: data?.insertId,
        });

        return res
          .status(200)
          .json({ message: "Chúc mừng! Tạo tài khoản thành công" });
      }
    );
  });
};

  // Xác thực tài khoản bằng email và mật khẩu.
  const login = (req, res) => {
  // Lấy email và password từ body của request
  const email = req.body.email;
  const password = req.body.password;
  // 1.1.9	Thư viện ExpressJs thực hiện câu lệnh SELECT kiểm tra người dùng có tồn  trong bảng person hay không?
  const sql = `SELECT email, first_name, person_type, password FROM person WHERE email=? AND password=?`;

  db.query(sql, [email, password], (err, data) => {
    if (err) return res.json(err);
    // 1.2.6    Nếu người dùng không tồn tại Database trả về dữ liệu rỗng.
    if (data.length === 0) {
      //1.2.7    API nhận dữ liệu rỗng từ database trả về lỗi không tìm thấy user dưới dạng json.
      return res.status(404).json({ message: "Xin lỗi, tài khoản không tồn tại!" });
    }
   // 1.2.0	Nếu người dùng tồn tại Database trả về dữ liệu user.
   //1.2.1	API nhận được data tiếp tục trả về dữ liệu user dưới dạng json cho frontend.
    return res.json(data);
  });
};

  return {
    registration,
    login,
  };
};

module.exports = createAuthController;
