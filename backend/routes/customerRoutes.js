const express = require("express");

const createCustomerRoutes = (controller) => {
  const router = express.Router();

  router.post("/customerProfile", controller.customerProfile);
  router.post("/customerPurchases", controller.customerPurchases);
  router.post("/cancelOneTicket", controller.cancelOneTicket);

  return router;
};

module.exports = createCustomerRoutes;
