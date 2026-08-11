const express = require("express");

const createAuthRoutes = (controller, { optionalAuthenticate, loginLimiter }) => {
  const router = express.Router();

  router.post("/registration", controller.registration);
  router.post("/login", loginLimiter, controller.login);
  router.get("/auth/me", optionalAuthenticate, controller.me);
  router.post("/logout", controller.logout);

  return router;
};

module.exports = createAuthRoutes;
