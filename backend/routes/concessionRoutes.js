const express = require("express");

const createConcessionRoutes = (controller, { allowRoles }) => {
  const router = express.Router();
  router.get("/concessions/catalog", controller.catalog);
  router.post(
    "/concessions/payos/create-payment-link",
    ...allowRoles("Customer", "Staff", "Admin"),
    controller.createPayOSOrder
  );
  router.post(
    "/concessions/counter-orders/create",
    ...allowRoles("Customer", "Staff", "Admin"),
    controller.createCounterOrder
  );
  return router;
};

module.exports = createConcessionRoutes;
