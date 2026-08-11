const express = require("express");

const createPaymentRoutes = (controller, { authentication }) => {
  const router = express.Router();
  const { allowRoles } = authentication;

  router.post("/payos/create-payment-link", ...allowRoles("Customer"), controller.payosCreatePaymentLink);
  router.post("/counter-orders/create", ...allowRoles("Customer"), controller.counterOrdersCreate);
  router.post("/payos/confirm-return", ...allowRoles("Customer"), controller.payosConfirmReturn);
  router.post("/payos/webhook", controller.payosWebhook);

  return router;
};

module.exports = createPaymentRoutes;
