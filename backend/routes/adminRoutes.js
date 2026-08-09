const express = require("express");

const createAdminRoutes = (controller, { uploadImage }) => {
  const router = express.Router();

  router.post("/adminOrders", controller.adminOrders);
  router.post("/adminOrderStatusUpdate", controller.adminOrderStatusUpdate);
  router.post("/adminMovies", controller.adminMovies);
  router.post("/adminMovieUpdate", controller.adminMovieUpdate);
  router.post("/adminMovieDelete", controller.adminMovieDelete);
  router.post("/adminMovieAdd", controller.adminMovieAdd);
  router.post("/totalTickets", controller.totalTickets);
  router.post("/totalPayment", controller.totalPayment);
  router.post("/totalCustomers", controller.totalCustomers);
  router.post("/totalTicketPerMovie", controller.totalTicketPerMovie);
  router.post("/genreInsert", controller.genreInsert);
  router.post("/directorInsert", controller.directorInsert);
  router.post("/adminShowtimeOptions", controller.adminShowtimeOptions);
  router.post("/adminShowtimeSlots", controller.adminShowtimeSlots);
  router.post("/adminShowtimeCreate", controller.adminShowtimeCreate);
  router.post("/adminShowtimeUpdate", controller.adminShowtimeUpdate);
  router.post("/adminShowtimeDelete", controller.adminShowtimeDelete);
  router.post("/adminShowtimeRestore", controller.adminShowtimeRestore);
  router.post("/adminDashboardStats", controller.adminDashboardStats);
  router.post("/adminRevenueStats", controller.adminRevenueStats);
  router.post("/adminOrderStatusStats", controller.adminOrderStatusStats);
  router.post("/adminBookingTimeStats", controller.adminBookingTimeStats);
  router.post("/adminRecentOrders", controller.adminRecentOrders);
  router.post("/adminTopMovies", controller.adminTopMovies);
  router.post("/adminUploadImage", uploadImage, controller.adminUploadImage);

  return router;
};

module.exports = createAdminRoutes;
