const express = require("express");

const createMediaRoutes = (controller) => {
  const router = express.Router();
  router.get("/media/:folder/:fileName", controller.getMedia);
  return router;
};

module.exports = createMediaRoutes;
