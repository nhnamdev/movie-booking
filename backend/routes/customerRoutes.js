const express = require("express");

const createCustomerRoutes = (controller, { allowRoles }) => {
  const router = express.Router();

  router.post("/customerProfile", ...allowRoles("Customer"), controller.customerProfile);
  router.post("/customerPurchases", ...allowRoles("Customer"), controller.customerPurchases);
  router.post("/customerHeldOrders", ...allowRoles("Customer"), controller.customerHeldOrders);
  router.post("/customerCancelHeldOrder", ...allowRoles("Customer"), controller.customerCancelHeldOrder);

  return router;
};

module.exports = createCustomerRoutes;
