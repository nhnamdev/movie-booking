const express = require("express");

const createCatalogRoutes = (controller, authentication = {}) => {
  const router = express.Router();
  const optionalAuth = authentication.optionalAuthenticate || ((req, res, next) => next());
  const requireAuth = authentication.authenticate || ((req, res, next) => next());

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

  // Movie reviews & dynamic average rating
  router.get("/movieReviews/:movieId", optionalAuth, controller.getMovieReviews);
  router.post("/movieReview", requireAuth, controller.addOrUpdateMovieReview);
  router.delete("/movieReview/:reviewId", requireAuth, controller.deleteMovieReview);
  router.delete("/movieReview", requireAuth, controller.deleteMovieReview);

  // Public Ticket Price Config
  router.get("/ticketPriceConfigs", controller.getTicketPriceConfigs);

  // Trigger seed showtimes (Dev/Admin)
  router.get("/seedCgvShowtimes", controller.triggerSeedCgvShowtimes);
  router.post("/seedCgvShowtimes", controller.triggerSeedCgvShowtimes);

  return router;
};

module.exports = createCatalogRoutes;
