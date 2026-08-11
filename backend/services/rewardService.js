const POINT_EARN_AMOUNT = 10000;
const POINT_REDEEM_VALUE = 1000;
const MAX_REDEMPTION_PERCENT = 50;
const { AUTHENTICATED_REQUEST } = require("../middleware/authContext");

// Quản lý số dư, sổ cái và vòng đời giữ điểm bằng transaction.
const createRewardService = ({ queryDbAsync, withTransaction }) => {
  const getRewardConfig = async (query = queryDbAsync) => {
    const rows = await query(
      `SELECT earn_amount_per_point, redeem_value_per_point,
        maximum_redemption_percent, point_expiry_days
       FROM reward_config WHERE id = 1 LIMIT 1`
    );
    const row = rows[0] || {};
    return {
      earnAmountPerPoint: Number(row.earn_amount_per_point || POINT_EARN_AMOUNT),
      redeemValuePerPoint: Number(row.redeem_value_per_point || POINT_REDEEM_VALUE),
      maximumRedemptionPercent: Number(row.maximum_redemption_percent || MAX_REDEMPTION_PERCENT),
      pointExpiryDays: row.point_expiry_days == null ? null : Number(row.point_expiry_days),
    };
  };

  const updateRewardConfig = async ({ earnAmountPerPoint, redeemValuePerPoint, maximumRedemptionPercent, pointExpiryDays }) => {
    const earn = Number(earnAmountPerPoint);
    const redeem = Number(redeemValuePerPoint);
    const maximum = Number(maximumRedemptionPercent);
    const expiry = pointExpiryDays === "" || pointExpiryDays == null ? null : Number(pointExpiryDays);
    if (!Number.isInteger(earn) || earn < 1000 || !Number.isInteger(redeem) || redeem < 100 ||
        !Number.isInteger(maximum) || maximum < 0 || maximum > 100 ||
        (expiry !== null && (!Number.isInteger(expiry) || expiry < 1))) {
      throw Object.assign(new Error("Cấu hình điểm thưởng không hợp lệ"), { statusCode: 400 });
    }
    await queryDbAsync(
      `UPDATE reward_config SET earn_amount_per_point = ?, redeem_value_per_point = ?,
        maximum_redemption_percent = ?, point_expiry_days = ? WHERE id = 1`,
      [earn, redeem, maximum, expiry]
    );
    return getRewardConfig();
  };
  const ensureCustomerAccount = async (email, query = queryDbAsync) => {
    await query(
      `INSERT IGNORE INTO reward_account (customer_email)
       SELECT email FROM person
       WHERE email = ? AND person_type = 'Customer' AND account_status = 'active'`,
      [email]
    );
    const rows = await query(
      "SELECT customer_email FROM reward_account WHERE customer_email = ? LIMIT 1",
      [email]
    );
    if (rows.length === 0) {
      const err = new Error("Tài khoản khách hàng không hợp lệ");
      err.statusCode = 403;
      throw err;
    }
  };

  const verifyCustomer = async (email, password) => {
    const sessionAuthenticated = password === AUTHENTICATED_REQUEST;
    const rows = await queryDbAsync(
      `SELECT email FROM person
       WHERE email = ? ${sessionAuthenticated ? "" : "AND password = ?"}
         AND person_type = 'Customer'
         AND account_status = 'active' LIMIT 1`,
      sessionAuthenticated ? [email] : [email, password]
    );
    if (rows.length === 0) {
      const err = new Error("Không thể truy cập điểm thưởng của tài khoản này");
      err.statusCode = 403;
      throw err;
    }
  };

  const maxUsablePoints = (availablePoints, grossAmount, config = {
    redeemValuePerPoint: POINT_REDEEM_VALUE,
    maximumRedemptionPercent: MAX_REDEMPTION_PERCENT,
  }) =>
    Math.max(
      0,
      Math.min(
        Number(availablePoints || 0),
        Math.floor((Number(grossAmount || 0) * config.maximumRedemptionPercent) / 100 / config.redeemValuePerPoint)
      )
    );

  const releaseRewardHold = async (orderCode) => {
    const transaction = await withTransaction();
    try {
      const holds = await transaction.query(
        "SELECT * FROM reward_point_hold WHERE order_code = ? FOR UPDATE",
        [Number(orderCode)]
      );
      const hold = holds[0];
      if (!hold || hold.status !== "HELD") {
        await transaction.commit();
        return false;
      }
      await ensureCustomerAccount(hold.customer_email, transaction.query);
      await transaction.query(
        `UPDATE reward_account
         SET available_points = available_points + ?, held_points = GREATEST(0, held_points - ?)
         WHERE customer_email = ?`,
        [Number(hold.points), Number(hold.points), hold.customer_email]
      );
      await transaction.query(
        "UPDATE reward_point_hold SET status = 'RELEASED' WHERE id = ?",
        [hold.id]
      );
      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    } finally {
      transaction.release();
    }
  };

  const releaseExpiredRewardHolds = async () => {
    const rows = await queryDbAsync(
      `SELECT H.order_code
       FROM reward_point_hold H
       LEFT JOIN payos_orders PO ON PO.order_code = H.order_code
       WHERE H.status = 'HELD'
         AND (H.expires_at <= NOW() OR PO.status IN ('FAILED', 'EXPIRED'))`
    );
    for (const row of rows) await releaseRewardHold(row.order_code);
    return rows.length;
  };

  const expireCustomerPoints = async (email) => {
    const config = await getRewardConfig();
    if (!config.pointExpiryDays) return 0;

    const transaction = await withTransaction();
    try {
      await ensureCustomerAccount(email, transaction.query);
      const [account] = await transaction.query(
        "SELECT available_points FROM reward_account WHERE customer_email = ? FOR UPDATE",
        [email]
      );
      let availableToExpire = Number(account.available_points || 0);
      const lots = await transaction.query(
        `SELECT id, order_code, remaining_points
         FROM reward_point_ledger
         WHERE customer_email = ? AND entry_type = 'EARN'
           AND remaining_points > 0 AND expires_at IS NOT NULL AND expires_at <= NOW()
         ORDER BY expires_at, id FOR UPDATE`,
        [email]
      );
      let expired = 0;
      for (const lot of lots) {
        if (availableToExpire <= 0) break;
        const quantity = Math.min(Number(lot.remaining_points), availableToExpire);
        if (quantity <= 0) continue;
        expired += quantity;
        availableToExpire -= quantity;
        await transaction.query(
          "UPDATE reward_point_ledger SET remaining_points = remaining_points - ? WHERE id = ?",
          [quantity, lot.id]
        );
        await transaction.query(
          `INSERT INTO reward_point_ledger
            (customer_email, order_code, entry_type, points_delta, balance_after, remaining_points, description)
           VALUES (?, ?, 'EXPIRE', ?, 0, 0, ?)
           ON DUPLICATE KEY UPDATE points_delta = points_delta + VALUES(points_delta)`,
          [email, Number(lot.order_code), -quantity, `Hết hạn điểm từ đơn #${lot.order_code}`]
        );
      }
      if (expired > 0) {
        await transaction.query(
          `UPDATE reward_account SET available_points = available_points - ?,
            lifetime_expired = lifetime_expired + ? WHERE customer_email = ?`,
          [expired, expired, email]
        );
        const [updated] = await transaction.query(
          "SELECT available_points FROM reward_account WHERE customer_email = ?",
          [email]
        );
        await transaction.query(
          `UPDATE reward_point_ledger SET balance_after = ?
           WHERE customer_email = ? AND entry_type = 'EXPIRE' AND balance_after = 0`,
          [Number(updated.available_points), email]
        );
      }
      await transaction.commit();
      return expired;
    } catch (err) {
      await transaction.rollback();
      throw err;
    } finally {
      transaction.release();
    }
  };

  const reserveRewardPoints = async ({ email, password, orderCode, grossAmount, requestedPoints, holdMinutes }) => {
    const gross = Number(grossAmount);
    const requested = Number(requestedPoints || 0);
    if (!Number.isInteger(gross) || gross <= 0 || !Number.isInteger(requested) || requested < 0) {
      const err = new Error("Dữ liệu sử dụng điểm không hợp lệ");
      err.statusCode = 400;
      throw err;
    }
    if (requested === 0) {
      return { pointsUsed: 0, discountAmount: 0, grossAmount: gross, payableAmount: gross };
    }
    await verifyCustomer(email, password);
    await releaseExpiredRewardHolds();
    await expireCustomerPoints(email);
    const config = await getRewardConfig();

    const transaction = await withTransaction();
    try {
      await ensureCustomerAccount(email, transaction.query);
      const accounts = await transaction.query(
        "SELECT * FROM reward_account WHERE customer_email = ? FOR UPDATE",
        [email]
      );
      const maximum = maxUsablePoints(accounts[0].available_points, gross, config);
      if (requested > maximum) {
        const err = new Error(`Đơn này chỉ có thể sử dụng tối đa ${maximum} điểm`);
        err.statusCode = 409;
        throw err;
      }
      const discountAmount = requested * config.redeemValuePerPoint;
      await transaction.query(
        `UPDATE reward_account
         SET available_points = available_points - ?, held_points = held_points + ?
         WHERE customer_email = ?`,
        [requested, requested, email]
      );
      await transaction.query(
        `INSERT INTO reward_point_hold
          (order_code, customer_email, points, discount_amount, status, expires_at)
         VALUES(?,?,?,?, 'HELD', DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
        [Number(orderCode), email, requested, discountAmount, Number(holdMinutes)]
      );
      await transaction.commit();
      return {
        pointsUsed: requested,
        discountAmount,
        grossAmount: gross,
        payableAmount: gross - discountAmount,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    } finally {
      transaction.release();
    }
  };

  const settlePaidOrderRewards = async (transactionQuery, { orderCode, email, paidAmount }) => {
    const config = await getRewardConfig(transactionQuery);
    await ensureCustomerAccount(email, transactionQuery);
    const accountRows = await transactionQuery(
      "SELECT * FROM reward_account WHERE customer_email = ? FOR UPDATE",
      [email]
    );
    let account = accountRows[0];
    const holds = await transactionQuery(
      "SELECT * FROM reward_point_hold WHERE order_code = ? FOR UPDATE",
      [Number(orderCode)]
    );
    const hold = holds[0];
    let redeemedPoints = 0;

    if (hold?.status === "HELD") {
      redeemedPoints = Number(hold.points);
      await transactionQuery(
        `UPDATE reward_account
         SET held_points = GREATEST(0, held_points - ?),
           lifetime_redeemed = lifetime_redeemed + ?
         WHERE customer_email = ?`,
        [redeemedPoints, redeemedPoints, email]
      );
      await transactionQuery(
        "UPDATE reward_point_hold SET status = 'REDEEMED' WHERE id = ?",
        [hold.id]
      );
      await transactionQuery(
        `INSERT IGNORE INTO reward_point_ledger
          (customer_email, order_code, entry_type, points_delta, balance_after, description)
         VALUES(?,?,'REDEEM',?,?,?)`,
        [email, Number(orderCode), -redeemedPoints, Number(account.available_points), `Dùng điểm cho đơn #${orderCode}`]
      );
      let pointsToConsume = redeemedPoints;
      const earnLots = await transactionQuery(
        `SELECT id, remaining_points FROM reward_point_ledger
         WHERE customer_email = ? AND entry_type = 'EARN' AND remaining_points > 0
         ORDER BY COALESCE(expires_at, '9999-12-31'), created_at, id FOR UPDATE`,
        [email]
      );
      for (const lot of earnLots) {
        if (pointsToConsume <= 0) break;
        const quantity = Math.min(pointsToConsume, Number(lot.remaining_points));
        await transactionQuery(
          "UPDATE reward_point_ledger SET remaining_points = remaining_points - ? WHERE id = ?",
          [quantity, lot.id]
        );
        pointsToConsume -= quantity;
      }
    } else if (hold && hold.status !== "REDEEMED") {
      throw Object.assign(new Error("Điểm giữ cho đơn không còn hiệu lực"), { statusCode: 409 });
    }

    const earnedPoints = Math.floor(Number(paidAmount || 0) / config.earnAmountPerPoint);
    if (earnedPoints > 0) {
      const ledgerResult = await transactionQuery(
        `INSERT IGNORE INTO reward_point_ledger
          (customer_email, order_code, entry_type, points_delta, balance_after,
           remaining_points, expires_at, description)
         VALUES(?,?,'EARN',?,0,?,
           CASE WHEN ? IS NULL THEN NULL ELSE DATE_ADD(NOW(), INTERVAL ? DAY) END,?)`,
        [email, Number(orderCode), earnedPoints, earnedPoints,
          config.pointExpiryDays, config.pointExpiryDays,
          `Cộng điểm từ đơn #${orderCode}`]
      );
      if (ledgerResult.affectedRows > 0) {
        await transactionQuery(
          `UPDATE reward_account
           SET available_points = available_points + ?, lifetime_earned = lifetime_earned + ?
           WHERE customer_email = ?`,
          [earnedPoints, earnedPoints, email]
        );
        const [updated] = await transactionQuery(
          "SELECT available_points FROM reward_account WHERE customer_email = ?",
          [email]
        );
        await transactionQuery(
          `UPDATE reward_point_ledger SET balance_after = ?
           WHERE order_code = ? AND entry_type = 'EARN'`,
          [Number(updated.available_points), Number(orderCode)]
        );
        account = { ...account, available_points: updated.available_points };
      }
    }
    return { redeemedPoints, earnedPoints, availablePoints: Number(account.available_points) };
  };

  const getRewardQuote = async ({ email, password, grossAmount, requestedPoints = 0 }) => {
    await verifyCustomer(email, password);
    await releaseExpiredRewardHolds();
    await expireCustomerPoints(email);
    await ensureCustomerAccount(email);
    const config = await getRewardConfig();
    const [account] = await queryDbAsync(
      "SELECT * FROM reward_account WHERE customer_email = ?",
      [email]
    );
    const maximum = maxUsablePoints(account.available_points, grossAmount, config);
    const requested = Math.max(0, Number(requestedPoints || 0));
    const applied = Math.min(maximum, Number.isInteger(requested) ? requested : 0);
    return {
      availablePoints: Number(account.available_points),
      heldPoints: Number(account.held_points),
      maximumUsablePoints: maximum,
      requestedPoints: requested,
      appliedPoints: applied,
      discountAmount: applied * config.redeemValuePerPoint,
      payableAmount: Math.max(0, Number(grossAmount || 0) - applied * config.redeemValuePerPoint),
      config,
    };
  };

  const getCustomerRewards = async ({ email, password }) => {
    await verifyCustomer(email, password);
    await releaseExpiredRewardHolds();
    await expireCustomerPoints(email);
    await ensureCustomerAccount(email);
    const config = await getRewardConfig();
    const [account] = await queryDbAsync(
      "SELECT * FROM reward_account WHERE customer_email = ?",
      [email]
    );
    const history = await queryDbAsync(
      `SELECT id, order_code, entry_type, points_delta, balance_after, description, created_at
       FROM reward_point_ledger WHERE customer_email = ?
       ORDER BY created_at DESC, id DESC LIMIT 100`,
      [email]
    );
    return {
      account: {
        availablePoints: Number(account.available_points),
        heldPoints: Number(account.held_points),
        lifetimeEarned: Number(account.lifetime_earned),
        lifetimeRedeemed: Number(account.lifetime_redeemed),
        lifetimeExpired: Number(account.lifetime_expired || 0),
      },
      history,
      config,
    };
  };

  return {
    getCustomerRewards,
    getRewardQuote,
    reserveRewardPoints,
    releaseRewardHold,
    releaseExpiredRewardHolds,
    expireCustomerPoints,
    settlePaidOrderRewards,
    maxUsablePoints,
    getRewardConfig,
    updateRewardConfig,
    POINT_EARN_AMOUNT,
    POINT_REDEEM_VALUE,
    MAX_REDEMPTION_PERCENT,
  };
};

module.exports = createRewardService;
