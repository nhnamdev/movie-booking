const express = require("express");

const createConcessionRoutes = (controller, { allowRoles }) => {
  const router = express.Router();
  router.get("/concessions/catalog", controller.catalog);
  router.post("/concessions/payos/create-payment-link", ...allowRoles("Customer"), controller.createPayOSOrder);
  router.post("/concessions/counter-orders/create", ...allowRoles("Customer"), controller.createCounterOrder);
  return router;
};

module.exports = createConcessionRoutes;
