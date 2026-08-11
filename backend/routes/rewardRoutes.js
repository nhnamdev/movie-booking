const express = require("express");

const createRewardRoutes = (controller, { allowRoles }) => {
  const router = express.Router();
  router.post("/customerRewards", ...allowRoles("Customer"), controller.customerRewards);
  router.post("/rewardQuote", ...allowRoles("Customer"), controller.rewardQuote);
  router.post("/adminRewardConfig", ...allowRoles("Admin"), controller.adminRewardConfig);
  router.post("/adminRewardConfigUpdate", ...allowRoles("Admin"), controller.adminRewardConfigUpdate);
  return router;
};

module.exports = createRewardRoutes;
