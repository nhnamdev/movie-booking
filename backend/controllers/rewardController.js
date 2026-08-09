// Cung cấp số dư, lịch sử và báo giá sử dụng điểm cho khách hàng.
const createRewardController = ({ getCustomerRewards, getRewardQuote }) => {
  const respond = async (res, action) => {
    try {
      return res.json(await action());
    } catch (err) {
      return res.status(err.statusCode || 500).json({ message: err.message || "Không thể xử lý điểm thưởng" });
    }
  };
  return {
    customerRewards: (req, res) => respond(res, () => getCustomerRewards(req.body)),
    rewardQuote: (req, res) => respond(res, () => getRewardQuote(req.body)),
  };
};

module.exports = createRewardController;
