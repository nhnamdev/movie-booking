const express = require("express");

const createPaymentRoutes = (controller, { legacyEndpointGuard }) => {
  const router = express.Router();

  router.post("/payment", legacyEndpointGuard, controller.payment);
  router.post("/purchaseTicket", legacyEndpointGuard, controller.purchaseTicket);
  router.post("/recentPurchase", legacyEndpointGuard, controller.recentPurchase);
  router.post("/payos/create-payment-link", controller.payosCreatePaymentLink);
  router.post("/counter-orders/create", controller.counterOrdersCreate);
  router.post("/payos/confirm-return", controller.payosConfirmReturn);
  router.post("/payos/webhook", controller.payosWebhook);

  return router;
};

module.exports = createPaymentRoutes;
