const express = require("express");

const createConcessionRoutes = (controller) => {
  const router = express.Router();
  router.get("/concessions/catalog", controller.catalog);
  router.post("/concessions/payos/create-payment-link", controller.createPayOSOrder);
  router.post("/concessions/counter-orders/create", controller.createCounterOrder);
  return router;
};

module.exports = createConcessionRoutes;
