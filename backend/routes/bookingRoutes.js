const express = require("express");

const createBookingRoutes = (controller) => {
  const router = express.Router();

  router.post("/showtimesDates", controller.showtimesDates);
  router.post("/uniqueMovies", controller.uniqueMovies);
  router.post("/halls", controller.halls);
  router.post("/seats", controller.seats);
  router.post("/movieCombos", controller.movieCombos);

  return router;
};

module.exports = createBookingRoutes;
