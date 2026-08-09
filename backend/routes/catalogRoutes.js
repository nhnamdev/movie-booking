const express = require("express");

const createCatalogRoutes = (controller) => {
  const router = express.Router();

  router.get("/", controller.health);
  router.get("/latestMovies", controller.latestMovies);
  router.get("/upcomingMovies", controller.upcomingMovies);
  router.get("/locationDetails", controller.locationDetails);
  router.get("/locationFeatures", controller.locationFeatures);
  router.get("/theatres", controller.theatres);
  router.post("/showtimes", controller.showtimes);
  router.get("/genres", controller.genres);
  router.post("/movieDetail", controller.movieDetail);
  router.post("/movieWiseShowtime", controller.movieWiseShowtime);
  router.post("/otherMovies", controller.otherMovies);

  return router;
};

module.exports = createCatalogRoutes;
