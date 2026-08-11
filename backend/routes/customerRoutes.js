const express = require("express");

const createCustomerRoutes = (controller, { allowRoles }) => {
  const router = express.Router();

  router.post("/customerProfile", ...allowRoles("Customer"), controller.customerProfile);
  router.post("/customerPurchases", ...allowRoles("Customer"), controller.customerPurchases);

  return router;
};

module.exports = createCustomerRoutes;
