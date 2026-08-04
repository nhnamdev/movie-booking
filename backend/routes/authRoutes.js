const express = require("express");

const createAuthRoutes = (controller) => {
  const router = express.Router();

  router.post("/registration", controller.registration);
  router.post("/login", controller.login);

  return router;
};

module.exports = createAuthRoutes;
