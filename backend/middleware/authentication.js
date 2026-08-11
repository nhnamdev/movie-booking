const jwt = require("jsonwebtoken");
const { AUTHENTICATED_REQUEST } = require("./authContext");

const COOKIE_NAME = "cgv_session";
const AUDITED_PATHS = /\/(adminOrderStatusUpdate|adminMovieUpdate|adminMovieDelete|adminMovieAdd|genreInsert|directorInsert|adminShowtimeCreate|adminShowtimeUpdate|adminShowtimeDelete|adminShowtimeRestore|adminTheatreUpsert|adminTheatreDelete|adminHallUpsert|adminHallDelete|adminHallLayoutSave|adminComboUpsert|adminComboPromotionUpsert|adminComboPromotionDelete|adminBranchComboUpsert|adminStaffUpsert|adminRewardConfigUpdate)$/;

const publicUser = (user) => ({
  email: user.email,
  first_name: user.first_name,
  last_name: user.last_name,
  phone_number: user.phone_number,
  person_type: user.person_type,
});

const createAuthentication = ({ queryDbAsync }) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters");
  }

  const signSession = (user) =>
    jwt.sign(
      { sub: user.email, role: user.person_type },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h", issuer: "cgv-booking" }
    );

  const setSessionCookie = (res, token) => {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
      path: "/",
    });
  };

  const clearSessionCookie = (res) => {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  };

  const authenticate = async (req, res, next) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      if (!token) return res.status(401).json({ message: "Vui lòng đăng nhập" });
      const payload = jwt.verify(token, secret, { issuer: "cgv-booking" });
      const rows = await queryDbAsync(
        `SELECT email, first_name, last_name, phone_number, person_type, account_status
         FROM person WHERE email = ? LIMIT 1`,
        [payload.sub]
      );
      const user = rows[0];
      if (!user || user.account_status !== "active" || user.person_type !== payload.role) {
        clearSessionCookie(res);
        return res.status(401).json({ message: "Phiên đăng nhập không còn hợp lệ" });
      }
      req.user = publicUser(user);
      req.body = req.body || {};
      req.body.email = user.email;
      req.body.password = AUTHENTICATED_REQUEST;
      req.body.customerPassword = AUTHENTICATED_REQUEST;
      if (AUDITED_PATHS.test(req.path)) {
        res.once("finish", () => {
          if (res.statusCode >= 400) return;
          const entityId = req.body.movieId || req.body.showtimeId || req.body.hallId ||
            req.body.theatreId || req.body.comboId || req.body.orderCode || req.body.staffEmail || null;
          queryDbAsync(
            `INSERT INTO audit_log
              (actor_email, actor_role, action, entity_type, entity_id, metadata_json)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user.email, user.person_type, req.path.slice(1), null, entityId ? String(entityId) : null, null]
          ).catch((auditError) => console.error("Audit log error:", auditError.message));
        });
      }
      return next();
    } catch (err) {
      clearSessionCookie(res);
      return res.status(401).json({ message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ" });
    }
  };

  const optionalAuthenticate = async (req, res, next) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const payload = jwt.verify(token, secret, { issuer: "cgv-booking" });
      const rows = await queryDbAsync(
        `SELECT email, first_name, last_name, phone_number, person_type, account_status
         FROM person WHERE email = ? LIMIT 1`,
        [payload.sub]
      );
      const user = rows[0];
      if (!user || user.account_status !== "active" || user.person_type !== payload.role) {
        clearSessionCookie(res);
        req.user = null;
        return next();
      }
      req.user = publicUser(user);
      return next();
    } catch (_error) {
      clearSessionCookie(res);
      req.user = null;
      return next();
    }
  };

  const allowRoles = (...roles) => [
    authenticate,
    (req, res, next) =>
      roles.includes(req.user.person_type)
        ? next()
        : res.status(403).json({ message: "Tài khoản không có quyền thực hiện chức năng này" }),
  ];

  return {
    authenticate,
    optionalAuthenticate,
    allowRoles,
    signSession,
    setSessionCookie,
    clearSessionCookie,
    publicUser,
  };
};

module.exports = createAuthentication;
