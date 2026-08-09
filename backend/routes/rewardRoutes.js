const express = require("express");

const createRewardRoutes = (controller) => {
  const router = express.Router();
  router.post("/customerRewards", controller.customerRewards);
  router.post("/rewardQuote", controller.rewardQuote);
  return router;
};

module.exports = createRewardRoutes;
